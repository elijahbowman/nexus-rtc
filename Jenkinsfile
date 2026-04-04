pipeline {
    agent {
        docker {
            image 'maven:3.9-eclipse-temurin-17'
            // Named Volume instead of a direct path mount
            args '-v maven-repo:/root/.m2'
        }
    }
    stages {
        stage('Build Backend') {
            steps {
                sh 'cd backend && mvn clean package -DskipTests'
            }
        }
    }
}