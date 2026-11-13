# Tactical & Surveillance Combat Drone Sim

Browser-based tactical surveillance and combat drone simulator. The quadcopter takes off from the Manufacturing Plant launchpad, carrying a 3-axis gimbal camera for route surveillance, precision strike sorties (Bomber), 2.5D A* and APF obstacle avoidance, and autonomous Return-to-Launch (RTL). You can control the drone via flight commands, keyboard, or virtual joysticks, monitoring full telemetry through the real-time dashboard and 3D scene.

**Live Demo:** https://huy-htg.github.io/drone-sim/

![Simulator Interface](docs/screenshot.png)

## Interface Overview

| Panel | Description |
|---|---|
| **Flight Operations** | Commands: ARM, DISARM, TAKEOFF, LAND, HOLD, MANUAL, MISSION, RTL, KILL; autonomous surveillance route generation, precision Bomber strike, and wind disturbance model. |
| **Surveillance** | Person and vehicle AI detection counters, live FOV footprint, ground coverage calculation, 2D tactical surveillance map, and 20MP high-res camera capture. |
| **State Machine** | 10 flight states with real-time active state highlighting, previous state history, transition reasons, and guard conditions. |
| **Telemetry Dashboard** | ALT, V/S, GS, HDG, distance to Plant, nearest obstacle distance, artificial horizon, battery state-of-charge, power consumption, motor outputs, and 30s telemetry history. |
| **3D Viewport** (Three.js) | Base structures & manufacturing plant, natural terrain, flight path trails, avoidance waypoints, 3D wind streamlines, and Chase/Orbit/FPV camera modes. |

---

## Getting Started

Open `index.html` directly in any modern browser (requires internet connection to load Three.js and web fonts via CDN). No local installation or build process is required.

- **Autonomous Surveillance:** Select a surveillance route (**Around Manufacturing Plant**, **Around Access Road Corridor**, **Outer Base Perimeter**, or custom **Click 3D Terrain**), adjust altitude, and click **Auto Fly 1 Lap**: the drone autonomously executes ARM → TAKEOFF → MISSION (flies surveillance waypoints with A* obstacle avoidance) → RTL (returns to Plant) → LANDING → DISARMED.
- **Bomber Strike Sortie:** Select a ground target, configure payload mass (0.25–2.0 kg), and click **💣 Launch Strike Sortie**: the drone takes off, flies an ingress corridor, solves the CCRP ballistic trajectory under wind drag, releases the bomb, executes egress maneuvers, and returns to Plant.
- **Simulate Datalink Loss:** Click **Simulate Datalink Loss (Blackbox)** to test autonomous fallback under complete communication loss.

---

## Keyboard Controls

| Key | Function (in HOVER or MANUAL) |
|---|---|
| `W` / `S` | Pitch forward / backward |
| `A` / `D` | Roll left / right |
| `↑` / `↓` | Throttle climb / descend |
| `←` / `→` | Yaw turn left / right |
| `Space` | Position Hold (Loiter) |
| `B` | Release bomb immediately (Manual Drop) |
| `P` | High-resolution 20MP photo snapshot |
| `C` | Toggle Drone FPV Camera view |
| `T` | Toggle Electro-Optical / Thermal Infrared sensor |
| `N` | Toggle Day / Night lighting mode |
| `H` | Toggle all dashboard panels for clean 3D view |

---

## Flight State Machine

The UAV avionics architecture implements a strict 10-state deterministic finite state machine (FSM):

```
DISARMED ──(ARM)──> ARMED ──(TAKEOFF)──> TAKEOFF ──(reach alt)──> HOVER
                                                                    │ ▲
                                        (stick) ┌───────────────────┘ │ (HOLD)
                                                ▼                     │
                                             MANUAL ──────────────────┘
                                                │
                                    (MISSION)   │ ▲ (HOLD / RTL)
                                                ▼ │
                                              MISSION
                                                │
                                     (done)     │ ▲ (done / batt / link)
                                                ▼ │
                                               RTL ──> LANDING ──> ARMED ──> DISARMED
                                                ▲
                                                │ (fail)
                                             FAILSAFE
                                                ▲
                                                │ (KILL / collision)
                                            EMERGENCY ──> DISARMED (on ground)
```

1. **DISARMED**: Drone parked on pad (0,0), motors off.
2. **ARMED**: Motors idling at low RPM, ready for departure. Auto-disarms after 12s if no takeoff.
3. **TAKEOFF**: Vertical climb to safe cruising altitude before departing plant grounds.
4. **HOVER**: Stable position hold and heading loiter with active wind rejection.
5. **MANUAL**: Manual stick control protected by 360° LiDAR Artificial Potential Fields (APF).
6. **MISSION**: Autonomous navigation along waypoints with 2.5D A* obstacle avoidance.
7. **RTL**: Autonomous return corridor calculation back to Plant pad (0,0).
8. **LANDING**: Precision controlled descent. Transitions to ARMED after 0.4s ground contact.
9. **FAILSAFE**: Triggered on critical battery (<15%) or datalink loss. Computes safe return corridor.
10. **EMERGENCY**: Instant motor cutoff triggered by KILL command or structural collision.

---

## Architecture & Technology

- **3D Engine:** Three.js (WebGL) with dynamic shadows, PBR materials, custom shaders, and particle systems.
- **Flight Dynamics:** 6-DOF rigid body quadcopter physics with momentum, aerodynamic drag, gyroscopic effects, and motor response lag.
- **Guidance & Navigation:** 2.5D A* path planning combined with real-time Artificial Potential Fields (APF) from 360° LiDAR rays.
- **Ballistics Engine:** Runge-Kutta numerical integration for gravity and wind drag trajectory prediction (CCRP/CCIP).
- **Typography:** Modern styling using `"Calibri", "Caribe", "Carlito", "Segoe UI", system-ui, sans-serif`.

---

## License

MIT License. See [LICENSE](LICENSE) for details.
