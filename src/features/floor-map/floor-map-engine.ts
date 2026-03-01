import {
  Application,
  Container,
  Graphics,
  Sprite,
  Text,
  Texture,
  type IApplicationOptions,
} from 'pixi.js';
import type { MapFloor, MapZone, MapSensor, MapViewport, MapZoneStatus } from './floor-map-types';
import { polygonCenter } from './floor-map-utils';
import { isValidFloorPlanPath } from './floor-map-utils';

const STATUS_COLORS: Record<
  MapZoneStatus,
  { fill: number; fillAlpha: number; border: number; borderAlpha: number; glow: number }
> = {
  safe: { fill: 0x00c46a, fillAlpha: 0.15, border: 0x00c46a, borderAlpha: 0.6, glow: 0x00c46a },
  warning: { fill: 0xffb700, fillAlpha: 0.15, border: 0xffb700, borderAlpha: 0.7, glow: 0xffb700 },
  danger: { fill: 0xff6b35, fillAlpha: 0.2, border: 0xff6b35, borderAlpha: 0.8, glow: 0xff6b35 },
  critical: { fill: 0xff2d2d, fillAlpha: 0.25, border: 0xff2d2d, borderAlpha: 1.0, glow: 0xff2d2d },
};

const SENSOR_LABELS: Record<string, string> = {
  temperature: 'T°',
  co_gas: 'CO',
  h2s_gas: 'H₂S',
  oxygen_level: 'O₂',
  noise_level: 'dB',
};

function sensorLabel(sensorType: string): string {
  const key = sensorType.toLowerCase().replace(/\s+/g, '_');
  return SENSOR_LABELS[key] ?? sensorType.slice(0, 2).toUpperCase();
}

export type ZoneClickCallback = (zone: MapZone, x: number, y: number) => void;
export type SensorHoverCallback = (sensor: MapSensor | null, x: number, y: number) => void;

export class FloorMapEngine {
  private app: Application | null = null;
  private viewport: MapViewport = { x: 0, y: 0, scale: 1 };
  private floorPlanLayer: Container = new Container();
  private floorPlanSprite: Sprite | null = null;
  private zoneLayer: Container = new Container();
  private sensorLayer: Container = new Container();
  private cameraLayer: Container = new Container();
  private labelLayer: Container = new Container();
  private zoneGraphics: Map<string, Graphics> = new Map();
  private sensorSprites: Map<string, Container> = new Map();
  private cameraSprites: Map<string, Container> = new Map();
  private labelGraphics: Map<string, Container> = new Map();
  private criticalZoneIds: Set<string> = new Set();
  private dangerZoneIds: Set<string> = new Set();
  private animationTime = 0;
  private currentFloor: MapFloor | null = null;
  private canvasWidth = 800;
  private canvasHeight = 600;
  private onZoneClick: ZoneClickCallback = () => {};
  private onSensorHover: SensorHoverCallback = () => {};
  private interactive = true;
  private isPointerDown = false;
  private lastPointer = { x: 0, y: 0 };
  private targetViewport: MapViewport | null = null;
  private resetViewStart: number | null = null;

  initialize(
    canvas: HTMLCanvasElement,
    width: number,
    height: number,
    onZoneClick: ZoneClickCallback,
    onSensorHover: SensorHoverCallback,
    interactive = true
  ): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.onZoneClick = onZoneClick;
    this.onSensorHover = onSensorHover;
    this.interactive = interactive;
    this.viewport = { x: 0, y: 0, scale: 1 };

    this.app = new Application({
      view: canvas,
      width,
      height,
      backgroundColor: 0x0a0f1a,
      antialias: true,
      resolution: window.devicePixelRatio ?? 1,
      autoDensity: true,
    } as unknown as IApplicationOptions);

    this.floorPlanLayer = new Container();
    this.zoneLayer = new Container();
    this.cameraLayer = new Container();
    this.sensorLayer = new Container();
    this.labelLayer = new Container();

    this.app.stage.addChild(this.floorPlanLayer);
    this.app.stage.addChild(this.zoneLayer);
    this.app.stage.addChild(this.cameraLayer);
    this.app.stage.addChild(this.sensorLayer);
    this.app.stage.addChild(this.labelLayer);

    if (interactive) this.setupInteraction();
    this.app.ticker.add(this.onTick, this);
  }

  private setupInteraction(): void {
    if (!this.app) return;
    const stage = this.app.stage;
    stage.eventMode = 'static';
    stage.hitArea = this.app.screen;

    stage.on('pointerdown', (e: { global: { x: number; y: number } }) => {
      this.isPointerDown = true;
      this.lastPointer = { x: e.global.x, y: e.global.y };
    });
    stage.on('pointermove', (e: { global: { x: number; y: number } }) => {
      if (this.isPointerDown) {
        const dx = e.global.x - this.lastPointer.x;
        const dy = e.global.y - this.lastPointer.y;
        this.viewport.x += dx;
        this.viewport.y += dy;
        this.lastPointer = { x: e.global.x, y: e.global.y };
      }
    });
    stage.on('pointerup', () => { this.isPointerDown = false; });
    stage.on('pointerupoutside', () => { this.isPointerDown = false; });
    stage.on('wheel', (e: WheelEvent) => {
      e.preventDefault();
      const centerX = this.canvasWidth / 2;
      const centerY = this.canvasHeight / 2;
      this.handleZoom(-e.deltaY, centerX, centerY);
    }, { passive: false });
  }

  loadFloor(floor: MapFloor): void {
    this.currentFloor = floor;
    this.clearAll();

    this.canvasWidth = this.app?.screen.width ?? this.canvasWidth;
    this.canvasHeight = this.app?.screen.height ?? this.canvasHeight;

    if (floor.floorPlanImagePath && isValidFloorPlanPath(floor.floorPlanImagePath)) {
      this.loadFloorPlanImageSync(floor.floorPlanImagePath);
    } else {
      this.drawGridBackground();
    }

    this.renderZones(floor.zones);
    this.renderCameras(floor.zones);
    this.renderSensors(floor.zones);
    this.renderLabels(floor.zones);
    this.resetView();
  }

  private loadFloorPlanImageSync(path: string): void {
    const url = path.startsWith('file://') ? path : path.startsWith('/') ? `file://${path}` : path;
    try {
      const tex = Texture.from(url);
      if (!this.app || !this.currentFloor) return;
      if (this.floorPlanSprite) {
        this.floorPlanLayer.removeChild(this.floorPlanSprite);
        this.floorPlanSprite.destroy();
      }
      this.floorPlanSprite = new Sprite(tex);
      const padding = 40;
      const maxW = this.canvasWidth - padding * 2;
      const maxH = this.canvasHeight - padding * 2;
      const scale = Math.min(maxW / this.floorPlanSprite.width, maxH / this.floorPlanSprite.height, 1);
      this.floorPlanSprite.scale.set(scale);
      this.floorPlanSprite.x = (this.canvasWidth - this.floorPlanSprite.width * scale) / 2;
      this.floorPlanSprite.y = (this.canvasHeight - this.floorPlanSprite.height * scale) / 2;
      this.floorPlanLayer.addChild(this.floorPlanSprite);
    } catch {
      this.drawGridBackground();
    }
  }

  private drawGridBackground(): void {
    const g = new Graphics();
    const step = 24;
    g.lineStyle({ width: 1, color: 0x1a2332 });
    for (let x = 0; x <= this.canvasWidth; x += step) {
      g.moveTo(x, 0).lineTo(x, this.canvasHeight);
    }
    for (let y = 0; y <= this.canvasHeight; y += step) {
      g.moveTo(0, y).lineTo(this.canvasWidth, y);
    }
    this.floorPlanLayer.addChild(g);
  }

  private clearAll(): void {
    this.floorPlanLayer.removeChildren();
    this.floorPlanSprite?.destroy();
    this.floorPlanSprite = null;
    this.zoneLayer.removeChildren();
    this.zoneGraphics.forEach((g) => g.destroy());
    this.zoneGraphics.clear();
    this.sensorLayer.removeChildren();
    this.sensorSprites.forEach((c) => c.destroy());
    this.sensorSprites.clear();
    this.cameraLayer.removeChildren();
    this.cameraSprites.forEach((c) => c.destroy());
    this.cameraSprites.clear();
    this.labelLayer.removeChildren();
    this.labelGraphics.forEach((c) => c.destroy());
    this.labelGraphics.clear();
    this.criticalZoneIds.clear();
    this.dangerZoneIds.clear();
  }

  private applyViewport(): void {
    const v = this.viewport;
    this.zoneLayer.x = v.x;
    this.zoneLayer.y = v.y;
    this.zoneLayer.scale.set(v.scale);
    this.floorPlanLayer.x = v.x;
    this.floorPlanLayer.y = v.y;
    this.floorPlanLayer.scale.set(v.scale);
    this.cameraLayer.x = v.x;
    this.cameraLayer.y = v.y;
    this.cameraLayer.scale.set(v.scale);
    this.sensorLayer.x = v.x;
    this.sensorLayer.y = v.y;
    this.sensorLayer.scale.set(v.scale);
    this.labelLayer.x = v.x;
    this.labelLayer.y = v.y;
    this.labelLayer.scale.set(v.scale);
  }

  renderZones(zones: MapZone[]): void {
    const canvasW = this.canvasWidth;
    const canvasH = this.canvasHeight;
    for (const zone of zones) {
      const coords = zone.coordinates && zone.coordinates.length >= 3
        ? zone.coordinates.map((p) => [(p[0] / 100) * canvasW, (p[1] / 100) * canvasH] as [number, number])
        : this.defaultQuadrantPolygon(zone.id, zones.indexOf(zone), canvasW, canvasH);
      const g = this.drawZonePolygon(zone, coords);
      if (this.interactive) {
        g.eventMode = 'static';
        g.cursor = 'pointer';
        g.on('pointerdown', (e: { global: { x: number; y: number } }) => {
          this.onZoneClick(zone, e.global.x, e.global.y);
        });
        g.on('pointerover', () => {
          g.clear();
          this.drawZonePolygonInto(g, zone, coords, true);
        });
        g.on('pointerout', () => {
          g.clear();
          this.drawZonePolygonInto(g, zone, coords, false);
        });
      }
      this.zoneLayer.addChild(g);
      this.zoneGraphics.set(zone.id, g);
      if (zone.status === 'critical') this.criticalZoneIds.add(zone.id);
      else if (zone.status === 'danger') this.dangerZoneIds.add(zone.id);
    }
  }

  private defaultQuadrantPolygon(_zoneId: string, index: number, w: number, h: number): [number, number][] {
    const p = 0.05;
    const halfW = w / 2;
    const halfH = h / 2;
    const quad = index % 4;
    if (quad === 0) return [[p * w, p * h], [halfW - p * w / 2, p * h], [halfW - p * w / 2, halfH - p * h / 2], [p * w, halfH - p * h / 2]];
    if (quad === 1) return [[halfW + p * w / 2, p * h], [w - p * w, p * h], [w - p * w, halfH - p * h / 2], [halfW + p * w / 2, halfH - p * h / 2]];
    if (quad === 2) return [[p * w, halfH + p * h / 2], [halfW - p * w / 2, halfH + p * h / 2], [halfW - p * w / 2, h - p * h], [p * w, h - p * h]];
    return [[halfW + p * w / 2, halfH + p * h / 2], [w - p * w, halfH + p * h / 2], [w - p * w, h - p * h], [halfW + p * w / 2, h - p * h]];
  }

  private drawZonePolygon(zone: MapZone, coords: [number, number][], highlight = false): Graphics {
    const g = new Graphics();
    this.drawZonePolygonInto(g, zone, coords, highlight);
    return g;
  }

  private drawZonePolygonInto(
    g: Graphics,
    zone: MapZone,
    coords: [number, number][],
    highlight: boolean
  ): void {
    const c = STATUS_COLORS[zone.status];
    let fillAlpha = c.fillAlpha;
    let borderAlpha = c.borderAlpha;
    let borderWidth = 2;
    if (highlight) {
      borderAlpha = Math.min(1, borderAlpha + 0.3);
      borderWidth = 3;
    }
    const flat = coords.flat();
    g.beginFill(c.fill, fillAlpha);
    g.lineStyle({ width: borderWidth, color: c.border, alpha: borderAlpha });
    g.drawPolygon(flat as number[]);
    g.endFill();
  }

  renderSensors(zones: MapZone[]): void {
    for (const zone of zones) {
      for (const sensor of zone.sensors) {
        const cont = new Container();
        cont.x = (sensor.positionX / 100) * this.canvasWidth;
        cont.y = (sensor.positionY / 100) * this.canvasHeight;
        const c = STATUS_COLORS[sensor.status];
        const glow = new Graphics();
        glow.beginFill(c.glow, 0.2);
        glow.drawCircle(0, 0, 14);
        glow.endFill();
        const dot = new Graphics();
        dot.beginFill(c.glow, 1);
        dot.drawCircle(0, 0, 7);
        dot.endFill();
        const label = new Text(sensorLabel(sensor.sensorType), {
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 8,
          fill: 0xffffff,
        });
        label.anchor.set(0.5, 1);
        label.y = -10;
        cont.addChild(glow);
        cont.addChild(dot);
        cont.addChild(label);
        if (this.interactive) {
          cont.eventMode = 'static';
          cont.cursor = 'pointer';
          cont.on('pointerover', (e: { global: { x: number; y: number } }) => {
            this.onSensorHover(sensor, e.global.x, e.global.y);
          });
          cont.on('pointerout', () => this.onSensorHover(null, 0, 0));
        }
        this.sensorLayer.addChild(cont);
        this.sensorSprites.set(sensor.id, cont);
      }
    }
  }

  renderCameras(zones: MapZone[]): void {
    for (const zone of zones) {
      for (const cam of zone.cameras) {
        const cont = new Container();
        cont.x = (cam.positionX / 100) * this.canvasWidth;
        cont.y = (cam.positionY / 100) * this.canvasHeight;
        const color = cam.isActive ? 0x00d4ff : 0x3a4560;
        const body = new Graphics();
        body.beginFill(color);
        body.drawRect(-6, -4, 12, 8);
        body.endFill();
        const angleRad = (cam.angleDegrees * Math.PI) / 180;
        const wedge = new Graphics();
        wedge.beginFill(color, 0.15);
        wedge.moveTo(0, 0);
        wedge.lineTo(30 * Math.cos(angleRad - Math.PI / 4), 30 * Math.sin(angleRad - Math.PI / 4));
        wedge.arc(0, 0, 30, angleRad - Math.PI / 4, angleRad + Math.PI / 4);
        wedge.lineTo(0, 0);
        wedge.endFill();
        const dot = new Graphics();
        dot.beginFill(cam.isActive ? 0x00ff00 : 0xff0000);
        dot.drawCircle(4, -2, 1.5);
        dot.endFill();
        cont.addChild(wedge);
        cont.addChild(body);
        cont.addChild(dot);
        this.cameraLayer.addChild(cont);
        this.cameraSprites.set(cam.id, cont);
      }
    }
  }

  renderLabels(zones: MapZone[]): void {
    const canvasW = this.canvasWidth;
    const canvasH = this.canvasHeight;
    for (const zone of zones) {
      const coords = zone.coordinates && zone.coordinates.length >= 3
        ? zone.coordinates.map((p) => [(p[0] / 100) * canvasW, (p[1] / 100) * canvasH])
        : [];
      const center = coords.length >= 3 ? polygonCenter(coords) : [canvasW / 2, canvasH / 2];
      const cont = new Container();
      cont.x = center[0];
      cont.y = center[1];
      const nameText = new Text(zone.name, {
        fontFamily: 'Rajdhani, sans-serif',
        fontSize: 13,
        fill: 0xffffff,
        fontWeight: 'bold',
      });
      nameText.anchor.set(0.5, 0);
      const scoreText = new Text(zone.score.toFixed(0), {
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 11,
        fill: STATUS_COLORS[zone.status].border,
      });
      scoreText.anchor.set(0.5, 0);
      scoreText.y = nameText.height + 2;
      cont.addChild(nameText);
      cont.addChild(scoreText);
      if (zone.activeAlerts > 0) {
        const badge = new Graphics();
        badge.beginFill(0xff0000);
        badge.drawCircle(20, -5, 8);
        badge.endFill();
        const alertNum = new Text(String(zone.activeAlerts), {
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 10,
          fill: 0xffffff,
        });
        alertNum.anchor.set(0.5, 0.5);
        alertNum.x = 20;
        alertNum.y = -5;
        cont.addChild(badge);
        cont.addChild(alertNum);
      }
      this.labelLayer.addChild(cont);
      this.labelGraphics.set(zone.id, cont);
    }
  }

  updateZoneStatus(zoneId: string, status: MapZoneStatus, score: number): void {
    const g = this.zoneGraphics.get(zoneId);
    if (!g || !this.currentFloor) return;
    const zone = this.currentFloor.zones.find((z) => z.id === zoneId);
    if (!zone) return;
    const updated = { ...zone, status, score };
    this.criticalZoneIds.delete(zoneId);
    this.dangerZoneIds.delete(zoneId);
    if (status === 'critical') this.criticalZoneIds.add(zoneId);
    else if (status === 'danger') this.dangerZoneIds.add(zoneId);
    const canvasW = this.canvasWidth;
    const canvasH = this.canvasHeight;
    const coords = zone.coordinates && zone.coordinates.length >= 3
      ? zone.coordinates.map((p) => [(p[0] / 100) * canvasW, (p[1] / 100) * canvasH] as [number, number])
      : this.defaultQuadrantPolygon(zoneId, this.currentFloor.zones.indexOf(zone), canvasW, canvasH);
    g.clear();
    this.drawZonePolygonInto(g, updated, coords, false);
    const labelCont = this.labelGraphics.get(zoneId);
    if (labelCont) {
      labelCont.removeChildren();
      const nameText = new Text(zone.name, {
        fontFamily: 'Rajdhani, sans-serif',
        fontSize: 13,
        fill: 0xffffff,
        fontWeight: 'bold',
      });
      nameText.anchor.set(0.5, 0);
      const scoreText = new Text(score.toFixed(0), {
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 11,
        fill: STATUS_COLORS[status].border,
      });
      scoreText.anchor.set(0.5, 0);
      scoreText.y = nameText.height + 2;
      labelCont.addChild(nameText);
      labelCont.addChild(scoreText);
    }
  }

  updateSensorStatus(sensorId: string, _value: number, _unit: string, status: MapZoneStatus): void {
    const cont = this.sensorSprites.get(sensorId);
    if (!cont || cont.children.length < 2) return;
    const c = STATUS_COLORS[status];
    const dot = cont.getChildAt(1) as Graphics;
    if (dot && 'clear' in dot) {
      dot.clear();
      dot.beginFill(c.glow, 1);
      dot.drawCircle(0, 0, 7);
      dot.endFill();
    }
    const glow = cont.getChildAt(0) as Graphics;
    if (glow && 'clear' in glow) {
      glow.clear();
      glow.beginFill(c.glow, 0.2);
      glow.drawCircle(0, 0, 14);
      glow.endFill();
    }
  }

  handleZoom(delta: number, centerX: number, centerY: number): void {
    const factor = delta > 0 ? 1.1 : 0.9;
    const newScale = Math.max(0.5, Math.min(3, this.viewport.scale * factor));
    this.viewport.x = centerX - (centerX - this.viewport.x) * (newScale / this.viewport.scale);
    this.viewport.y = centerY - (centerY - this.viewport.y) * (newScale / this.viewport.scale);
    this.viewport.scale = newScale;
  }

  resetView(): void {
    this.viewport = { x: 0, y: 0, scale: 1 };
    this.targetViewport = null;
    this.resetViewStart = null;
    this.applyViewport();
  }

  private onTick(delta: number): void {
    this.animationTime += delta;
    if (this.targetViewport && this.resetViewStart != null) {
      const elapsed = (performance.now() - this.resetViewStart) / 1000;
      const t = Math.min(1, elapsed / 0.3);
      const ease = 1 - (1 - t) * (1 - t);
      this.viewport.x = this.viewport.x + (this.targetViewport.x - this.viewport.x) * ease * 0.2;
      this.viewport.y = this.viewport.y + (this.targetViewport.y - this.viewport.y) * ease * 0.2;
      this.viewport.scale = this.viewport.scale + (this.targetViewport.scale - this.viewport.scale) * ease * 0.2;
      if (t >= 1) this.targetViewport = null;
      this.applyViewport();
      return;
    }
    this.criticalZoneIds.forEach((zoneId) => {
      const g = this.zoneGraphics.get(zoneId);
      if (!g) return;
      const zone = this.currentFloor?.zones.find((z) => z.id === zoneId);
      if (!zone) return;
      const pulse = 0.15 + Math.sin(this.animationTime * 0.05) * 0.1;
      g.clear();
      const canvasW = this.canvasWidth;
      const canvasH = this.canvasHeight;
      const coords = zone.coordinates && zone.coordinates.length >= 3
        ? zone.coordinates.map((p) => [(p[0] / 100) * canvasW, (p[1] / 100) * canvasH] as [number, number])
        : this.defaultQuadrantPolygon(zoneId, this.currentFloor!.zones.indexOf(zone), canvasW, canvasH);
      g.beginFill(STATUS_COLORS.critical.fill, pulse);
      g.lineStyle({ width: 2, color: STATUS_COLORS.critical.border, alpha: STATUS_COLORS.critical.borderAlpha });
      g.drawPolygon(coords.flat() as number[]);
      g.endFill();
    });
    this.dangerZoneIds.forEach((zoneId) => {
      const g = this.zoneGraphics.get(zoneId);
      if (!g) return;
      const zone = this.currentFloor?.zones.find((z) => z.id === zoneId);
      if (!zone) return;
      const pulse = 0.15 + Math.sin(this.animationTime * 0.02) * 0.05;
      g.clear();
      const canvasW = this.canvasWidth;
      const canvasH = this.canvasHeight;
      const coords = zone.coordinates && zone.coordinates.length >= 3
        ? zone.coordinates.map((p) => [(p[0] / 100) * canvasW, (p[1] / 100) * canvasH] as [number, number])
        : this.defaultQuadrantPolygon(zoneId, this.currentFloor!.zones.indexOf(zone), canvasW, canvasH);
      g.beginFill(STATUS_COLORS.danger.fill, pulse);
      g.lineStyle({ width: 2, color: STATUS_COLORS.danger.border, alpha: STATUS_COLORS.danger.borderAlpha });
      g.drawPolygon(coords.flat() as number[]);
      g.endFill();
    });
    this.applyViewport();
  }

  resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    if (this.app?.renderer?.resize) {
      (this.app.renderer as { resize: (w: number, h: number) => void }).resize(width, height);
    }
  }

  destroy(): void {
    if (this.app) {
      this.app.ticker.remove(this.onTick, this);
      this.app.destroy(true, { children: true, texture: true });
      this.app = null;
    }
    this.clearAll();
    this.zoneGraphics.clear();
    this.sensorSprites.clear();
    this.cameraSprites.clear();
    this.labelGraphics.clear();
  }
}
