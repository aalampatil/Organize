import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { requestCodeSchema } from '@organize/contracts';
import { useSession } from './SessionProvider';

export function useEmailAuth() {
  const { api, accept } = useSession();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [retryAt, setRetryAt] = useState(0);
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const tick = () => setSeconds(Math.max(0, Math.ceil((retryAt - Date.now()) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [retryAt]);
  const send = useMutation({
    mutationFn: async (email: string) => {
      const input = requestCodeSchema.parse({ email });
      const response = await api.requestCode(input.email);
      setSentTo(input.email);
      setRetryAt(Date.now() + response.retryAfter * 1000);
    },
  });
  const verify = useMutation({
    mutationFn: async (code: string) => {
      if (!sentTo) return;
      await accept(await api.verifyCode(sentTo, code));
    },
  });
  return {
    sentTo,
    seconds,
    send,
    verify,
    reset() {
      setSentTo(null);
      send.reset();
      verify.reset();
    },
  };
}
