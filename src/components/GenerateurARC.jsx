
import React, { useEffect } from 'react';

export default function GenerateurARC() {
  useEffect(() => {
    window.location.replace('https://veridoc.io/');
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white text-gray-800">
      <h1 className="text-2xl font-bold mb-3">Redirection vers Veridoc</h1>
      <p className="text-gray-500">
        Vous allez être redirigé vers Veridoc...
      </p>
      <a
        href="https://veridoc.io/"
        className="mt-5 px-5 py-3 rounded-xl bg-[#FFB103] text-black font-semibold hover:bg-[#d49400] transition-colors"
      >
        Accéder à Veridoc
      </a>
    </div>
  );
}
