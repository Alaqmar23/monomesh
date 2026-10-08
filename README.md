# 🧊 Monomesh

**Flat to fully dimensional—from just one glance.**

Monomesh is a high-performance, serverless web application that leverages state-of-the-art AI to instantly transform any 2D photograph into a clean, volumetric 3D mesh. Built with cost-efficiency and user experience in mind, the platform allows creators, designers, and developers to generate 3D assets ready for CAD or 3D printing without expensive software or technical expertise.


## ✨ Key Features
* **Single-Image Reconstruction:** Drop in any standard JPG or PNG, and the AI will hallucinate the unseen geometry to construct a fully watertight 3D model.
* **Lightning Fast:** Generates detailed 3D models (up to 50k+ faces) in under 20 seconds.
* **Serverless Architecture:** Completely decoupled frontend and backend. The GPU completely shuts off when not actively generating a model, resulting in $0.00 idle costs.
* **Robust Failover:** The React frontend automatically round-robins across multiple GPU endpoints to guarantee zero downtime during traffic spikes.
* **In-Browser 3D Viewer:** Built-in Three.js studio allowing users to inspect the mesh in Solid, Wireframe, or Confidence modes before downloading.
* **Universal Export:** Instantly export generated models to `.glb`, `.obj`, or `.ply` formats natively in the browser.

---

## 🛠️ Tech Stack

**Frontend (Vercel)**
* **Framework:** React + TypeScript (Vite)
* **Styling:** TailwindCSS + Custom CSS animations
* **3D Rendering:** Three.js + React Three Fiber (`@react-three/drei`)
* **State & Logic:** Robust HTTP polling system with automatic Base64-to-Blob decoding.

**Backend (Modal)**
* **Infrastructure:** Serverless containers via Modal
* **Hardware:** Nvidia T4 / A10G GPUs
* **API:** FastAPI
* **AI Model:** InstantMesh (PyTorch, xformers, nvdiffrast)

---

## 🏗️ How It Works (The Pipeline)
1. **Upload:** A user uploads a 2D image via the React interface.
2. **Dispatch:** The frontend sends the image to a serverless FastAPI endpoint. If an endpoint is busy or out of credits, it instantly fails over to a backup URL.
3. **Inference:** A Modal GPU container spins up. It removes the background, estimates depth, projects a point cloud, and runs Poisson surface reconstruction.
4. **Polling:** Because AI generation takes ~20 seconds (exceeding standard HTTP timeouts), the backend immediately returns a `job_id`. The frontend silently pings a `/status` endpoint every 2 seconds.
5. **Delivery:** Once the GPU finishes, it writes the `.glb` mesh to a shared persistent dictionary. The frontend downloads it, decodes it, and renders it directly onto the user's screen.


---

## 📄 License
This project relies on the open-source InstantMesh architecture. Please review their respective licenses for commercial usage of the generated 3D assets.
