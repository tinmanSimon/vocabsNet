// utils/randomVecNear.js
export const randomVecNear = (anchor, r = 50) => {
    if (!anchor)
      return [(Math.random()-0.5)*200,
              (Math.random()-0.5)*200,
              (Math.random()-0.5)*200];
    return [
      anchor[0] + (Math.random()-0.5)*r,
      anchor[1] + (Math.random()-0.5)*r,
      anchor[2] + (Math.random()-0.5)*r,
    ];
  };
  