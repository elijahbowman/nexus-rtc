#!/bin/zsh

kubectl delete -f k8s/backend-deployment.yml

docker build --no-cache -t nexus-rtc-backend:latest ./backend

minikube image load nexus-rtc-backend:latest

kubectl apply -f k8s/backend-deployment.yml

kubectl rollout status deployment/nexus-rtc-backend