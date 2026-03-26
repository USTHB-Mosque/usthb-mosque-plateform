export type Constraints<T> = {
  [K in keyof T]?: {
    fn: (value: T[K]) => boolean;
    defaultValue: T[K] | ((value: T[K]) => T[K]);
  };
};

function resolveDefaultValue<V>(
  defaultValue: V | ((value: V) => V),
  value: V
): V {
  return typeof defaultValue === "function"
    ? (defaultValue as (v: V) => V)(value)
    : defaultValue;
}

export function applyObjectConstraints<T extends object>(
  values: T,
  constraints?: Constraints<T>
) {
  if (!constraints) return values;
  for (const key in constraints) {
    if (!constraints[key]) continue;
    const { fn, defaultValue } = constraints[key];

    const value = values[key];

    if (!fn(value)) {
      values[key] = resolveDefaultValue(defaultValue, value);
    }
  }

  return values;
}
