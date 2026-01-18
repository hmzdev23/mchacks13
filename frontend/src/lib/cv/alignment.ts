export type Point2D = [number, number];

export interface AlignmentResult {
  alignedExpert: Point2D[];
  scale: number;
  translation: Point2D;
  rotation: number;
  quality: number;
  matrix: number[][];
}

const DEFAULT_ANCHORS = [0, 5, 9];
const EPS = 1e-6;

const isFinitePoint = (point: Point2D | undefined | null): point is Point2D =>
  !!point && Number.isFinite(point[0]) && Number.isFinite(point[1]);

const mean = (values: number[]) => {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const centroid = (points: Point2D[]): Point2D => {
  if (!points.length) return [0, 0];
  const totals = points.reduce(
    (acc, point) => [acc[0] + point[0], acc[1] + point[1]] as Point2D,
    [0, 0]
  );
  return [totals[0] / points.length, totals[1] / points.length];
};

const distance = (a: Point2D, b: Point2D) => Math.hypot(a[0] - b[0], a[1] - b[1]);

const buildMatrix = (scale: number, translation: Point2D, rotation: number): number[][] => {
  const c = Math.cos(rotation);
  const s = Math.sin(rotation);
  return [
    [scale * c, -scale * s, translation[0]],
    [scale * s, scale * c, translation[1]],
    [0, 0, 1],
  ];
};

const applyTransform = (points: Point2D[], scale: number, translation: Point2D, rotation: number): Point2D[] => {
  const c = Math.cos(rotation);
  const s = Math.sin(rotation);
  return points.map(([x, y]) => {
    const sx = x * scale;
    const sy = y * scale;
    const rx = sx * c - sy * s;
    const ry = sx * s + sy * c;
    return [rx + translation[0], ry + translation[1]] as Point2D;
  });
};

export const alignHands = (expert: Point2D[], user: Point2D[], anchors: number[] = DEFAULT_ANCHORS): AlignmentResult => {
  const validAnchors = anchors.filter(
    (idx) => idx < expert.length && idx < user.length && isFinitePoint(expert[idx]) && isFinitePoint(user[idx])
  );
  const quality = anchors.length ? validAnchors.length / anchors.length : 0;

  if (validAnchors.length < 2) {
    return {
      alignedExpert: expert.slice(),
      scale: 1,
      translation: [0, 0],
      rotation: 0,
      quality,
      matrix: buildMatrix(1, [0, 0], 0),
    };
  }

  const expAnchors = validAnchors.map((idx) => expert[idx]);
  const usrAnchors = validAnchors.map((idx) => user[idx]);
  const expCenter = centroid(expAnchors);
  const usrCenter = centroid(usrAnchors);

  const expScale = mean(expAnchors.map((point) => distance(point, expCenter)));
  const usrScale = mean(usrAnchors.map((point) => distance(point, usrCenter)));
  const scale = expScale > EPS ? usrScale / expScale : 1;

  let rotation = 0;
  if (expAnchors.length >= 2) {
    const expVec: Point2D = [expAnchors[1][0] - expAnchors[0][0], expAnchors[1][1] - expAnchors[0][1]];
    const usrVec: Point2D = [usrAnchors[1][0] - usrAnchors[0][0], usrAnchors[1][1] - usrAnchors[0][1]];
    if (Math.hypot(expVec[0], expVec[1]) > EPS && Math.hypot(usrVec[0], usrVec[1]) > EPS) {
      rotation = Math.atan2(usrVec[1], usrVec[0]) - Math.atan2(expVec[1], expVec[0]);
    }
  }

  const c = Math.cos(rotation);
  const s = Math.sin(rotation);
  const expCenterTx: Point2D = [expCenter[0] * scale * c - expCenter[1] * scale * s, expCenter[0] * scale * s + expCenter[1] * scale * c];
  const translation: Point2D = [usrCenter[0] - expCenterTx[0], usrCenter[1] - expCenterTx[1]];

  return {
    alignedExpert: applyTransform(expert, scale, translation, rotation),
    scale,
    translation,
    rotation,
    quality,
    matrix: buildMatrix(scale, translation, rotation),
  };
};

export const alignPose = (
  expert: Point2D[],
  user: Point2D[],
  options: { anchors?: number[]; allowRotation?: boolean; clampRotationRad?: number } = {}
): AlignmentResult => {
  const anchors = options.anchors ?? [11, 12, 23, 24];
  const allowRotation = options.allowRotation ?? false;
  const clampRotation = options.clampRotationRad;

  const validAnchors = anchors.filter(
    (idx) => idx < expert.length && idx < user.length && isFinitePoint(expert[idx]) && isFinitePoint(user[idx])
  );
  const quality = anchors.length ? validAnchors.length / anchors.length : 0;

  if (validAnchors.length < 2) {
    return {
      alignedExpert: expert.slice(),
      scale: 1,
      translation: [0, 0],
      rotation: 0,
      quality,
      matrix: buildMatrix(1, [0, 0], 0),
    };
  }

  const expAnchors = validAnchors.map((idx) => expert[idx]);
  const usrAnchors = validAnchors.map((idx) => user[idx]);
  const expCenter = centroid(expAnchors);
  const usrCenter = centroid(usrAnchors);

  const expScale = mean(expAnchors.map((point) => distance(point, expCenter)));
  const usrScale = mean(usrAnchors.map((point) => distance(point, usrCenter)));
  const scale = expScale > EPS ? usrScale / expScale : 1;

  let rotation = 0;
  if (allowRotation && expAnchors.length >= 2) {
    const expVec: Point2D = [expAnchors[1][0] - expAnchors[0][0], expAnchors[1][1] - expAnchors[0][1]];
    const usrVec: Point2D = [usrAnchors[1][0] - usrAnchors[0][0], usrAnchors[1][1] - usrAnchors[0][1]];
    if (Math.hypot(expVec[0], expVec[1]) > EPS && Math.hypot(usrVec[0], usrVec[1]) > EPS) {
      rotation = Math.atan2(usrVec[1], usrVec[0]) - Math.atan2(expVec[1], expVec[0]);
    }
  }

  if (clampRotation !== undefined) {
    rotation = Math.max(-clampRotation, Math.min(clampRotation, rotation));
  }

  const c = Math.cos(rotation);
  const s = Math.sin(rotation);
  const expCenterTx: Point2D = [
    expCenter[0] * scale * c - expCenter[1] * scale * s,
    expCenter[0] * scale * s + expCenter[1] * scale * c,
  ];
  const translation: Point2D = [usrCenter[0] - expCenterTx[0], usrCenter[1] - expCenterTx[1]];

  return {
    alignedExpert: applyTransform(expert, scale, translation, rotation),
    scale,
    translation,
    rotation,
    quality,
    matrix: buildMatrix(scale, translation, rotation),
  };
};
