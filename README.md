# Real-Time Discord-style Mesh Communication Platform
A high-performance, containerized, real-time communication platform built to demonstrate advanced system design patterns, secure asynchronous signaling, and a privacy-first WebRTC peer negotiation engine.

---

## 🚦 Engineering Project Status

> ⚠️ **Implementation Note**: This repository currently houses the **Phase 1 production-ready MVP**. The foundational single-node containerized engine, secure signaling layer, and media privacy pipeline are fully implemented and verified. Horizontally scalable cloud infrastructure expansions are currently in active development.

| Architecture Milestone | Target Scope | Current Status |
| :--- | :--- | :--- |
| **Phase 1: Core MVP** | JWT WebSockets, WebRTC Mesh, Local Docker-Compose | ✅ **Production Complete** |
| **Phase 2: Horizontal Scaling** | Redis Pub/Sub Distributed Signaling Cluster | 🛠️ *Up Next / In Development* |
| **Phase 3: Cloud Orchestration** | Kubernetes Manifests, HPA, Nginx Ingress | 📅 *Planned Pipeline* |
| **Phase 4: High Availability** | Shared-State Coturn Multi-Region TURN Relays | 📅 *Planned Pipeline* |

---

## 🏗️ System Architecture Overview
The system utilizes a decoupled client-server architecture designed to scale from a single-node containerized environment (`docker-compose`) to a distributed cloud orchestration topology (`Kubernetes`).

```text
                              +---------------------------------------+

                              |           React Frontend UI           |
                              |    (Nginx Base Container / Port 80)   |
                              +---------------------------------------+
                                  /                               \
                     REST APIs   /                                 \  WebRTC Media
                   (Auth/Tokens) /                                   \ (SRTP / STUN / TURN)
                                v                                     v
    +---------------------------------------+             +-------------------------------+

    |          Spring Boot Backend          |             |         Coturn Server         |
    |      (Java 17 Runtime / Port 8080)    |             |    (STUN/TURN / Port 3478)    |
    +---------------------------------------+             +-------------------------------+

          |                           |                                       |
    STOMP | Broker             JDBC   |                                       | Traversal
    Over  | Channels                  v                                       | Verification
    Web   |                  +-----------------------+                        |
    Sock  v                  |   PostgreSQL Engine   | <----------------------+
  (Inbound Interceptor)      |   (Data Layer/5432)   | (Volume Preserved)
                             +-----------------------+

+-----------------------+
```

### 📡 Full-Duplex Signaling Loop
1. **Handshake Initialization**: Clients establish a standard WebSocket abstraction via **STOMP** over TCP.
2. **Identity Injection**: Custom inbound channel interceptors parse incoming `Bearer JWT` headers inside connection packets, upgrading anonymous connections to securely mapped, stateful application `Principal` entities.
3. **Session Routing**: The `SignalingController` acts as a pass-through layer, routing Session Description Protocol (**SDP**) `OFFER`, `ANSWER`, and Interactive Connectivity Establishment (**ICE**) candidate payloads across a unified broadcast hub (`/topic/public`).

---

## 🛠️ Software Engineering Design Patterns

The codebase is built around foundational software engineering design patterns to maintain strict compliance with enterprise 5+ YOE maintainability standards:

*   **Observer Pattern**: Leveraged natively across the WebSocket message broker subscription channel architecture. The client application acts as an observer monitoring the state of `/topic/public`, dynamically processing real-time system mutations upon incoming signal events.
*   **Strategy Pattern (Media State Isolation)**: Implemented within the frontend hooks layer. Audio and video track executions decouple completely from structural interface rendering using hardware-level toggle parameters (`track.enabled = false`) to enforce zero-leak runtime isolation boundaries.
*   **Facade Pattern (React Composition)**: Structural components like `VideoCall.tsx` use clean abstraction surfaces. They consume raw streams directly through customized wrapper layers (`useChat.ts`) without requiring direct visibility into downstream connection engines, ice candidate queues, or connection status loops.

---

## 🔒 Security Configuration & Privacy Hardening

### 1. Hardware State Gatekeeping
To prioritize data privacy and minimize unexpected exposure vectors, the platform establishes an intentional hardware-zeroing mechanism during connection creation:
*   Media streams are grabbed to stabilize WebRTC handshake negotiations (`navigator.mediaDevices.getUserMedia`).
*   Tracks are instantly muted at the system interface boundary before generating the initial network packet descriptor:
    ```typescript
    stream.getAudioTracks().forEach(track => track.enabled = false);
    stream.getVideoTracks().forEach(track => track.enabled = false);


* Streams remain fully closed locally until the user makes an explicit UI action, shifting network state update verification boundaries away from generic connection hooks.

## 2. Dual-Layer Token Authentication

* HTTP Layer Security: Stateless OncePerRequestFilter integrations parse inbound authorization payloads against core configuration targets (p. 2). Non-authenticated API entry points are closed off, isolating core controller actions.
* WebSocket Interception: Standard anonymous socket routing boundaries are restricted. The application explicitly intercepts the native connection frame, validates the cryptographically signed JWT, and binds user identities into the underlying runtime session.

------------------------------
## 🚀 DevOps & Continuous Integration Layout
The infrastructure layout uses an automated validation pipeline running inside an isolated multi-agent architecture.
## 1. Decoupled Pipeline Construction (Jenkinsfile)
The integration loop splits execution scopes across distinct, targeted runtime environments:

* Backend Validation Block: Instantiates a bounded maven: 3.9-eclipse-temurin-17 workspace image to securely complete independent automated verification scripts and regression testing maps.
* Frontend Type Enforcement: Concurrently provisions an independent node:20-alpine environment, triggering headless compilation sweeps (tsc --noEmit) to verify interface definitions without emitting code.
* Bake Stage Dropdown: Safely exits isolated application container layers to execute Docker builds straight via host daemon channels (Docker-outside-of-Docker layout).

## 2. Isolated Storage Management (docker-compose.yml)
The engine architecture segregates core external networks from localized filesystem scopes:

* Postgres Persistent Volumes: Avoids direct runtime mounts by assigning data storage responsibilities directly to a dedicated named subsystem block (pg_persistence_layer).
* Coturn Network Mapping: Restricts random allocation ranges by forcing a narrow, high-port UDP traffic window (49152-49252) tailored for optimized firewall traversal.

------------------------------
## 💻 Technical Setup & Local Execution

## Prerequisites

* Docker Desktop installed
* Node.js v20+ (for manual client development)
* Maven 3.9+ / Java 17 (for manual backend testing)

## Step 1: Clone and Provision Configuration Files
Ensure you have a valid local setup configuration. Provide your security profile parameters inside backend/src/main/resources/application.yml.
## Step 2: Spin Up the Infrastructure Environment
Execute the deployment run command from the root configuration path:

docker-compose up --build -d

This single invocation builds and launches:

   1. PostgreSQL Engine at localhost:5432
   2. Spring Boot Service Application at localhost:8080
   3. Nginx Served Client Production Layer at localhost:80
   4. Coturn NAT Gateway Routing Subsystem at localhost:3478

## Step 3: Run Verification Test Suites
Verify integration status bounds locally:

cd backend && mvn test

cd frontend && npm install && npm run build