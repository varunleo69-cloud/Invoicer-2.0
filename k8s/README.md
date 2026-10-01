# Invoicer on Minikube

The Kubernetes deployment is managed by GitHub Actions. The self-hosted GitHub Actions runner runs on the same Ubuntu machine as Minikube.

Browser -> nginx NodePort -> frontend / backend Service -> 5 backend Pods -> PostgreSQL

## CI/CD flow

1. Push to `main`.
2. GitHub Actions runs tests.
3. GitHub Actions builds backend/frontend images.
4. Images are pushed to GHCR using the commit SHA.
5. The self-hosted runner applies these manifests to Minikube.
6. The runner updates the Deployments to the exact commit images and waits for rollout.
7. A smoke test calls `/health` and `/api/v1/invoices`.

## Required GitHub repository secret

Create `DB_PASSWORD` under GitHub repository **Settings -> Secrets and variables -> Actions**. Use the same password as the existing PostgreSQL database if you want to keep the existing PVC/data.

## Manual deployment (optional)

```bash
kubectl apply -f k8s/invoicer.yaml
kubectl get pods -n invoicer
minikube service nginx -n invoicer --url
```

## Remove everything

```bash
kubectl delete namespace invoicer
```

This removes the Kubernetes PostgreSQL PVC and its data.
