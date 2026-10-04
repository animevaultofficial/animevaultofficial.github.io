import { useEffect, useRef } from 'react';

const PUBLISHER_ID = 'ca-pub-5409400183775621';
const AD_SLOT_ID = '4554141412';

export default function AdSenseUnit() {
  const adRef = useRef(null);
  const requested = useRef(false);

  useEffect(() => {
    if (!adRef.current || requested.current) return;
    requested.current = true;

    try {
      const queue = window.adsbygoogle || [];
      window.adsbygoogle = queue;
      queue.push({});
    } catch (error) {
      console.warn('[AnimeVault] Could not initialize the AdSense unit:', error);
    }
  }, []);

  return (
    <aside className="adsense-placement" aria-label="Advertisement">
      <span className="adsense-label">Advertisement</span>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={PUBLISHER_ID}
        data-ad-slot={AD_SLOT_ID}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
