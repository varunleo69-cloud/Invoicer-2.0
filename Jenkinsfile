pipeline {
    agent any

    environment {
        COMPOSE_PROJECT_NAME = 'invoicer'
        BASE_URL = 'http://localhost:8080'   // nginx load balancer (HTTP_PORT)
    }

    stages {
        stage('Install & Test') {
            steps {
                echo '📦 Installing dependencies and running tests...'
                sh 'npm ci'
                sh 'npm test'
            }
        }

        stage('Build Images') {
            steps {
                echo '🔨 Building frontend and backend images...'
                sh 'docker compose build'
            }
        }

        stage('Deploy Stack') {
            steps {
                echo '🚀 Deploying nginx, frontend, backend replicas and PostgreSQL...'
                // --wait blocks until services with a healthcheck are healthy
                sh 'docker compose up -d --remove-orphans --wait --wait-timeout 120'
            }
        }

        stage('Smoke Test') {
            steps {
                echo '🔍 Testing the path a real user takes: browser -> nginx -> backend -> database'
                sh '''
                    # Wait for the load balancer instead of a fixed sleep
                    for i in $(seq 1 30); do
                        curl -fsS "$BASE_URL/health" >/dev/null 2>&1 && break
                        echo "waiting for stack ($i/30)..."
                        sleep 2
                    done

                    curl -fsS "$BASE_URL/health"
                    curl -fsS "$BASE_URL/" >/dev/null

                    # End-to-end: create, read and delete an invoice through the load balancer
                    RESP=$(curl -fsS -X POST "$BASE_URL/api/v1/invoices" \
                        -H 'Content-Type: application/json' \
                        -d '{"items":[{"name":"smoke-test","price":100,"quantity":1,"taxRate":0.18}]}')
                    ID=$(echo "$RESP" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).invoice.id))")
                    curl -fsS "$BASE_URL/api/v1/invoices/$ID" >/dev/null
                    curl -fsS -X DELETE "$BASE_URL/api/v1/invoices/$ID"

                    # Prove the load balancer really spreads requests over several replicas
                    COUNT=$(for i in $(seq 1 10); do
                        curl -fsS -D - -o /dev/null "$BASE_URL/health" | tr -d '\\r' | grep -i '^x-instance:' || true
                    done | sort -u | wc -l)
                    echo "distinct backend replicas that answered: $COUNT"
                    [ "$COUNT" -ge 2 ]
                '''
            }
        }
    }

    post {
        success {
            echo '🎉 Invoicer CI/CD deployment completed successfully.'
        }
        failure {
            echo '🚨 Pipeline failed. Container status and logs follow.'
            sh 'docker compose ps || true'
            sh 'docker compose logs --tail=60 || true'
        }
    }
}
