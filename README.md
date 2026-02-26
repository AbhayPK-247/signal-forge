# Signal Forge | Advanced DSP Suite

**Signal Forge** is a professional-grade signal processing and synthesis environment built for the browser. It allows engineers, students, and hobbyists to generate, modulate, record, and analyze complex signals with real-time feedback and high-fidelity visualization.

## Modules

- **Signal Generator**: Create foundational waveforms with clean phase control.
- **Modulation Lab**: Explore AM, FM, PM, and digital modulation (ASK, FSK, PSK) with live constellations and FFTs.
- **Recording Lab**: High-fidelity audio acquisition, library management, and feature extraction.
- **Real Signal Lab**: Interface with hardware or files for real-world signal analysis.

## Getting Started

### Prerequisites
- Node.js & npm installed.

### Local Development
```sh
# 1. Clone & Install
npm i

# 2. Run Dev Server
npm run dev
```

### Build & Deploy
```sh
# Build for production
npm run build

# Preview production build
npm run preview
```

## Technologies
- **Vite** & **TypeScript**
- **React** & **shadcn/ui**
- **Web Audio API**
- **Web Workers** (for DSP compute)
- **Plotly.js** & **Recharts**

## Deployment
This project is optimized for deployment on **Vercel** or **Netlify**. Simply run `npm run build` and point your provider to the `dist` directory.
