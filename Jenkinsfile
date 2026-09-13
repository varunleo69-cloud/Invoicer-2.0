pipeline {
    agent any

    environment {
        COMPOSE_PROJECT_NAME = 'invoicer'
    }

    stages {
        stage('Install & Test') {
            steps {
                echo '📦 Installing dependencies and running tests...'
                sh 'npm install'
                sh 'npm test'
            }
        }

        stage('Build Images') {
            steps {
                echo '🔨 Building separate frontend and backend images...'
                sh 'docker compose build'
            }
        }

        stage('Deploy Stack') {
            steps {
                echo '🚀 Deploying frontend, backend and PostgreSQL...'
                sh 'docker compose up -d --remove-orphans'
            }
        }

        stage('Smoke Test') {
            steps {
                echo '🔍 Checking backend and frontend...'
                sh 'sleep 5'
                sh 'curl -f http://localhost:3000/health'
                sh 'curl -f http://localhost:8080/'
            }
        }
    }

    post {
        success {
            echo '🎉 Invoicer CI/CD deployment completed successfully.'
        }
        failure {
            echo '🚨 Pipeline failed. Check the failed stage and container logs.'
        }
    }
}
