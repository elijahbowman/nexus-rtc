// Same-origin URLs: the page, /api and /ws are served from one host in every setup
// (Kubernetes ingress, the Compose gateway, and the Vite dev proxy), so one build works everywhere.
// VITE_API_URL / VITE_WS_URL can still override them, e.g. to point at a remote backend.
const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

export const API_URL: string = import.meta.env.VITE_API_URL || '/api';
export const WS_URL: string = import.meta.env.VITE_WS_URL || `${wsProtocol}//${window.location.host}/ws`;
