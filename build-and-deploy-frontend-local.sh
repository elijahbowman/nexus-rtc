#!/bin/zsh

kubectl delete -f k8s/frontend-deployment.yml

docker build --no-cache -t nexus-rtc-frontend:latest ./frontend

minikube image load nexus-rtc-frontend:latest

kubectl apply -f k8s/frontend-deployment.yml

kubectl rollout status deployment/nexus-rtc-frontend