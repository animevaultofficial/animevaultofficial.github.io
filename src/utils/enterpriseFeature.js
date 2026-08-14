export const enterpriseFeature = {
  id: import.meta.env.VITE_HCAPTCHA_SITEKEY || '',
  secret: '',
  enabled: Boolean(import.meta.env.VITE_HCAPTCHA_SITEKEY),
};

export function getEnterpriseFeatureConfig() {
  return {
    ...enterpriseFeature,
  };
}
