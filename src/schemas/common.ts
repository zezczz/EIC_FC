import { z } from "zod";

/** 动态路由参数可能是 string | string[] */
export const routeParamString = z.preprocess(
  (value) => (Array.isArray(value) ? value[0] : value),
  z.string().min(1),
);

export const routeUuidParam = z.preprocess(
  (value) => (Array.isArray(value) ? value[0] : value),
  z.string().uuid("无效的 ID"),
);
