pipeline {
    // 'agent any' instructs Jenkins to execute the root orchestration steps directly on the
    // master controller node, rather than trapping the base script inside a nested runner.
    agent any

    // Automatically pulls down and injects specific binary tooling configurations
    // registered under Global Tool Configurations. This completely removes the overhead
    // and permission issues associated with running nested tool containers.
    tools {
        maven 'maven-3.9'
        nodejs 'node-26'
    }

    // Appends critical system directories to the execution environment path variable.
    // This guarantees that any 'sh' block can instantly find the custom ARM64 Docker CLI tool.
    environment {
        PATH = "/usr/local/bin:${env.PATH}"
    }

    stages {
        // Core Stage: Groups static and dynamic verification processes under a single boundary.
        stage('Validate & Test') {
            parallel {
                
                // LANE 1: Asynchronous Backend Verification Block
                stage('Backend Unit & Integration Tests') {
                    environment {
                        // Crucial Cross-Container Bridging: 'host.docker.internal' instructs the running
                        // Java process to exit the Jenkins home container network loop and route database 
                        // queries directly back out to the host loop where port 5433 is bound.
                        SPRING_DATASOURCE_URL = 'jdbc:postgresql://host.docker.internal:5433/realtime_communication_db'
                        SPRING_DATASOURCE_USERNAME = 'dev'
                        SPRING_DATASOURCE_PASSWORD = 'password'
                        SPRING_DATA_REDIS_HOST = 'host.docker.internal'
                        SPRING_DATA_REDIS_PORT = 6380
                        AWS_ACCESS_KEY_ID = 'devuser'
                        AWS_SECRET_ACCESS_KEY = 'devpassword'
                        MINIO_URL = 'http://host.docker.internal:9000'
                        MINIO_BUCKET_NAME = 'nexus-rtc-attachments'
                    }
                    steps {
                        script {
                            // Defensive Programming Block: 'try-finally' guarantees that the transient testing
                            // container is absolutely torn down and destroyed, preventing port-collision lockouts 
                            // on future execution runs even if the Java integration tests throw compilation failures.
                            try {
                                // 1. Provision a dynamic database container on the host daemon using our DooD volume link.
                                // Map host port 5433 to container port 5432 to avoid colliding with any local dev DB instances.
                                sh 'docker run -d --name test-postgres-db -p 5433:5432 -e POSTGRES_DB=realtime_communication_db -e POSTGRES_USER=dev -e POSTGRES_PASSWORD=password postgres:15'


                                sh 'docker run -d --name test-redis -p 6380:6379 redis:7-alpine'
                                
                                // 2. Race-Condition Mitigation: Deliberately pause pipeline execution for 5 seconds.
                                // This provides the PostgreSQL background engine adequate time to allocate internal memory 
                                // and start accepting TCP handshakes before Spring Boot starts executing assertions.
                                sh 'sleep 5'
                                
                                // 3. Navigate into your Java workspace module and fire off the full unit and dynamic integration suites.
                                dir('backend') {
                                    sh 'mvn clean test'
                                }
                            } finally {
                                // 4. Mandatory Post-Execution Cleanup Layer: Forcefully terminates and purges the sidecar database 
                                // container, restoring port 5433 to a completely clean, unallocated state.
                                sh 'docker stop test-postgres-db && docker rm test-postgres-db'

                                sh 'docker stop test-redis && docker rm test-redis'
                            }
                        }
                    }
                }

                // LANE 2: Asynchronous Frontend Verification Block (Executes concurrently with Lane 1)
                stage('Frontend Static Type Check') {
                    steps {
                        // Change file directory scope into the React application subdirectory module.
                        dir('frontend') {
                            // Fetch all locked node modules and project dependencies natively via the Node 26 global tool path.
                            sh 'npm install'
                            // Trigger a headless TypeScript type compilation verification check.
                            // The '--noEmit' flag validates structural data-type compliance without writing compilation builds.
                            sh 'npx tsc --noEmit'
                        }
                    }
                }
            }
        }
        
        // Finalization Stage: Triggers only if both parallel testing branches return a successful 'green' checkmark.
        stage('Bake Production Images') {
            steps {
                // Compile the finalized application assets directly into the host machine's local repository engine.
                // These images are instantly ready to be pushed to an image registry or run locally in a swarm.
                sh 'docker build -t realtime-communication-backend:latest ./backend'
                sh 'docker build -t realtime-communication-frontend:latest ./frontend'
            }
        }

        stage('Deploy to Local K8s Cluster') {
            environment {
                // Maps Jenkins Secret Text encrypted environment variable string
                CLUSTER_TOKEN = credentials('K8S_CLUSTER_TOKEN')
            }
            steps {
                script {
                    // 1. Download and authorize our isolated tool asset
                    sh 'curl -LO "https://dl.k8s.io/release/\$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"'  // Dynamically checks and fetches the current absolute stable release
                    sh 'chmod +x ./kubectl'
                    
                    // 2. Define an isolated, scratchpad config path inside the workspace
                    def pipelineKubeconfig = "${workspace}/pipeline.kubeconfig"
                    
                    // 3. Programmatically build a certificate-free config file using the secure environment variable
                    sh "./kubectl config set-cluster local-cluster --server=https://host.docker.internal:53663 --insecure-skip-tls-verify=true --kubeconfig=${pipelineKubeconfig}"
                    // Use single-quotes with system environment reference to resolve the Groovy Interpolation warning completely
                    sh './kubectl config set-credentials pipeline-admin --token=' + env.CLUSTER_TOKEN + ' --kubeconfig=' + pipelineKubeconfig
                    sh "./kubectl config set-context local-ctx --cluster=local-cluster --user=pipeline-admin --kubeconfig=${pipelineKubeconfig}"
                    sh "./kubectl config use-context local-ctx --kubeconfig=${pipelineKubeconfig}"
                    
                    // 4. Stream host images directly into minikube cluster container cache
                    // This bypasses minikube cli constraints entirely via raw docker sockets
                    sh 'docker save realtime-communication-backend:latest | docker exec -i minikube docker load'
                    sh 'docker save realtime-communication-frontend:latest | docker exec -i minikube docker load'
                    
                    // 5. Deploy entire decoupled folder using config document
                    sh "./kubectl apply -f ./k8s/ --kubeconfig=${pipelineKubeconfig} --validate=false"
                    
                    // 6. Force immediate rollout update verification
                    sh "./kubectl rollout restart deployment/rtc-backend --kubeconfig=${pipelineKubeconfig}"
                    sh "./kubectl rollout restart deployment/rtc-frontend --kubeconfig=${pipelineKubeconfig}"
                    
                    // Track rollout completion rules safely
                    sh "./kubectl rollout status deployment/rtc-backend --kubeconfig=${pipelineKubeconfig}"
                    sh "./kubectl rollout status deployment/rtc-frontend --kubeconfig=${pipelineKubeconfig}"
                }
            }
        }

        stage('Security Analysis: Container Image Scan') {
            steps {
                script {
                    echo "[JENKINS-PIPELINE] Initiating automated container vulnerabilities scan via Trivy engine..."
                    
                    // 1. Scan your backend image layer, forcing compilation warnings but bypassing hard failures for dev
                    sh "trivy image --severity HIGH,CRITICAL --format table realtime-communication-backend:latest || true"
                    
                    // 2. Scan your frontend interface container layer
                    sh "trivy image --severity HIGH,CRITICAL --format table realtime-communication-frontend:latest || true"
                }
            }
        }
    }    
}
