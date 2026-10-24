pipeline {
    agent any

    tools {
        maven 'maven-3.9'
        nodejs 'node-26'
    }

    environment {
        PATH             = "/usr/local/bin:${env.PATH}"
        REGISTRY_TAG     = "latest"
        // KNOWN ISSUE (P1): the manifests and deployments are named nexus-rtc-*, so these images are never
        // used and the rollout commands below target deployments that don't exist.
        BACKEND_IMAGE    = "rtc-backend"
        FRONTEND_IMAGE   = "rtc-frontend"
        
        // Unused: kubectl uses the Jenkins pod's ServiceAccount (P6)
        CLUSTER_TOKEN    = credentials('k8s-cluster-admin-token')
    }

    stages {
        stage('🧹 Workspace Purge') {
            steps {
                echo '⚡ [STAGE: DIAGNOSTIC] -> Checking baseline container directory spaces...'
                pwd()
                sh 'ls -la'

                echo '⚡ [STAGE: CLEANUP] -> Flushing historical workspace artifacts...'
                deleteDir() // Redundant with WipeWorkspace in the checkout stage
            }
        }
        stage('📥 Source Checkout') {
            steps {
                echo '⚡ [STAGE: CHECKOUT] -> Synchronizing project repository branches...'
                // Fresh clone on every run
                checkout([$class: 'GitSCM', 
                    branches: scm.branches,
                    extensions: scm.extensions + [[$class: 'WipeWorkspace']], 
                    userRemoteConfigs: scm.userRemoteConfigs
                ])
                
                echo '📸 [POST-CHECKOUT DEBUG] -> Verifying downloaded file structures:'
                sh 'ls -la'
            }
        }
        // Backend tests and frontend type check, in parallel. Tests rely on Docker bridge IPs (B8).
        stage('Validate & Test') {
            parallel {
                stage('Backend Unit & Integration Tests') {
                    environment {
                        SPRING_DATASOURCE_URL      = 'jdbc:postgresql://172.17.0.1:5433/realtime_communication_db'
                        SPRING_DATASOURCE_USERNAME = 'dev'
                        SPRING_DATASOURCE_PASSWORD = 'password'
                        SPRING_DATA_REDIS_HOST     = '172.17.0.1'
                        SPRING_DATA_REDIS_PORT     = 6380
                        AWS_ACCESS_KEY_ID          = 'devuser'
                        AWS_SECRET_ACCESS_KEY      = 'devpassword'
                        MINIO_URL                  = 'http://minio-service:9000'
                        MINIO_BUCKET_NAME          = 'nexus-rtc-attachments'
                    }
                    steps {
                        script {
                            try {
                                sh 'docker run -d --name test-postgres-db -p 5433:5432 -e POSTGRES_DB=realtime_communication_db -e POSTGRES_USER=dev -e POSTGRES_PASSWORD=password postgres:15'
                                sh 'docker run -d --name test-redis -p 6380:6379 redis:7-alpine'
                                sh 'sleep 5'
                                dir('backend') {
                                    sh 'mvn clean test'
                                }
                            } finally {
                                sh 'docker stop test-postgres-db && docker rm test-postgres-db'
                                sh 'docker stop test-redis && docker rm test-redis'
                            }
                        }
                    }
                }
                stage('Frontend Static Type Check') {
                    steps {
                        dir('frontend') {
                            sh 'npm install'
                            sh 'npx tsc --noEmit'
                        }
                    }
                }
            }
        }
        
        // Build images. KNOWN ISSUE (P4): mutable :latest tags, no registry push, no rollback.
        stage('Bake Production Images') {
            parallel {
                // --pull fetches base images for the host architecture (arm64 on Apple Silicon)
                stage('Compile Backend Layer') {
                    steps {
                        sh "docker build --platform linux/arm64 --no-cache --pull -t ${BACKEND_IMAGE}:${REGISTRY_TAG} ./backend"
                    }
                }
                stage('Compile Frontend Layer') {
                    steps {
                        sh "docker build --platform linux/arm64 --no-cache --pull -t ${FRONTEND_IMAGE}:${REGISTRY_TAG} ./frontend"
                    }
                }
            }
        }

        // Deploy. KNOWN ISSUE (P1): deployment/rtc-* doesn't exist. KNOWN ISSUE (P3): runs before the image scan.
        stage('Deploy to Local K8s Cluster') {
            steps {
                script {
                    echo '⚡ [CD: PROMOTION] -> Updating cluster resources over port 80...'
                    
                    // Uses the Jenkins pod's ServiceAccount. Only these two manifests are applied (P6).
                    sh "kubectl apply -f k8s/backend-deployment.yml"
                    sh "kubectl rollout restart deployment/rtc-backend"

                    sh "kubectl apply -f k8s/frontend-deployment.yml"
                    sh "kubectl rollout restart deployment/rtc-frontend"
                    
                    // Wait for the rollouts (no explicit --timeout)
                    sh "kubectl rollout status deployment/rtc-backend"
                    sh "kubectl rollout status deployment/rtc-frontend"
                }
            }
        }

        // Image scan. KNOWN ISSUE (P3): runs after deploy, and `|| true` means it can never fail the build.
        stage('Security Analysis: Container Image Scan') {
            steps {
                script {
                    echo "[JENKINS-PIPELINE] Initiating automated container vulnerabilities scan via Trivy engine..."

                    // Install the ARM64 Trivy package
                    sh 'curl -fsSL https://github.com/aquasecurity/trivy/releases/download/v0.72.0/trivy_0.72.0_Linux-ARM64.deb -o trivy.deb'
                    sh 'dpkg -i trivy.deb'
                    sh 'rm trivy.deb'

                    echo "[JENKINS-PIPELINE] Executing container vulnerability sweeps via Trivy..."
                    sh "trivy image --severity HIGH,CRITICAL --format table ${BACKEND_IMAGE}:${REGISTRY_TAG} || true"
                    sh "trivy image --severity HIGH,CRITICAL --format table ${FRONTEND_IMAGE}:${REGISTRY_TAG} || true"
                }
            }
        }
    }
}