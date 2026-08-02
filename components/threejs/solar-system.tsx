"use client";

import { useRef, useEffect } from "react";
import * as THREE from "three";

interface PlanetConfig {
  radius: number;
  distance: number;
  speed: number;
  color: string;
}

const PLANETS: PlanetConfig[] = [
  { radius: 0.08, distance: 1.5, speed: 2.0, color: "#6ee7b7" },
  { radius: 0.1, distance: 2.1, speed: 1.4, color: "#93c5fd" },
  { radius: 0.12, distance: 2.8, speed: 1.0, color: "#fca5a5" },
  { radius: 0.09, distance: 3.5, speed: 0.7, color: "#d8b4fe" },
  { radius: 0.07, distance: 4.2, speed: 0.5, color: "#fde68a" },
];

export function SolarSystem() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / container.clientHeight,
      0.1,
      100,
    );
    camera.position.set(0, 3, 6);
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 2, 50);
    pointLight.position.set(0, 0, 0);
    scene.add(pointLight);

    // Sun
    const sunGeom = new THREE.SphereGeometry(0.35, 32, 32);
    const sunMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xfacc15,
      emissiveIntensity: 0.6,
    });
    const sun = new THREE.Mesh(sunGeom, sunMat);
    scene.add(sun);

    // Planets (particle-like small spheres)
    const planets: { mesh: THREE.Mesh; config: PlanetConfig; angle: number }[] =
      [];

    for (const config of PLANETS) {
      const geom = new THREE.SphereGeometry(config.radius, 16, 16);
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(config.color),
        emissive: new THREE.Color(config.color),
        emissiveIntensity: 0.2,
      });
      const mesh = new THREE.Mesh(geom, mat);
      scene.add(mesh);
      planets.push({ mesh, config, angle: Math.random() * Math.PI * 2 });
    }

    // Orbit ring helpers
    for (const config of PLANETS) {
      const ringGeom = new THREE.RingGeometry(
        config.distance - 0.01,
        config.distance + 0.01,
        64,
      );
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.08,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.rotation.x = -Math.PI / 2;
      scene.add(ring);
    }

    // Animation
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);

      // Slowly rotate sun
      sun.rotation.y += 0.005;

      // Move planets
      for (const planet of planets) {
        planet.angle += planet.config.speed * 0.01;
        planet.mesh.position.x =
          Math.cos(planet.angle) * planet.config.distance;
        planet.mesh.position.z =
          Math.sin(planet.angle) * planet.config.distance;
        planet.mesh.position.y = Math.sin(planet.angle * 0.5) * 0.15;
        planet.mesh.rotation.y += 0.02;
      }

      renderer.render(scene, camera);
    };
    animate();

    // Resize observer
    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const observer = new ResizeObserver(handleResize);
    observer.observe(container);

    // Cleanup
    return () => {
      cancelAnimationFrame(frameRef.current);
      observer.disconnect();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      sunGeom.dispose();
      sunMat.dispose();
      for (const planet of planets) {
        planet.mesh.geometry.dispose();
        (planet.mesh.material as THREE.Material).dispose();
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="h-full min-h-[300px] w-full rounded-lg overflow-hidden"
      aria-label="3D solar system visualization"
    />
  );
}
