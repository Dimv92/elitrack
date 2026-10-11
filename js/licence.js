"use strict";
/* ================= LICENCES PREMIUM (signature ECDSA P-256, WebCrypto du navigateur, aucun serveur) =================
   Mode Dieu (js/dieu.js) : crée la paire de clés et SIGNE les codes avec la clé privée (jamais publiée, jamais exportée avec les données).
   Site public (public/, copie de ce fichier) : VÉRIFIE les codes avec la clé publique de public/config.json.
   Format et contrôles (compte, expiration, révocation) : licParse / licCheck dans pures.js. */
const LIC_ALGO = {name:'ECDSA', namedCurve:'P-256'}, LIC_SIG = {name:'ECDSA', hash:'SHA-256'};
const LIC = {
  ok:() => !!(window.crypto && crypto.subtle),
  async genKeys() {
    const k = await crypto.subtle.generateKey(LIC_ALGO, true, ['sign', 'verify']);
    const priv = await crypto.subtle.exportKey('jwk', k.privateKey), pub = jwkPub(await crypto.subtle.exportKey('jwk', k.publicKey));
    return {priv:{kty:'EC', crv:'P-256', x:priv.x, y:priv.y, d:priv.d}, pub};
  },
  async sign(privJwk, p) {
    const key = await crypto.subtle.importKey('jwk', Object.assign({}, privJwk, {ext:true, key_ops:['sign']}), LIC_ALGO, false, ['sign']);
    const head = licHead(p), sig = new Uint8Array(await crypto.subtle.sign(LIC_SIG, key, utf8(head)));
    return head + '.' + b64uEnc(sig);
  },
  // {p} si la signature est bonne, sinon {err : format | signature | cle}
  async verify(pubJwk, code) {
    const P = licParse(code); if (P.err) return P;
    const pub = jwkPub(pubJwk); if (!pub) return {err:'cle'};
    try {
      const key = await crypto.subtle.importKey('jwk', Object.assign({}, pub, {ext:true, key_ops:['verify']}), LIC_ALGO, false, ['verify']);
      return await crypto.subtle.verify(LIC_SIG, key, P.sig, utf8(P.head)) ? {p:P.p} : {err:'signature'};
    } catch (e) { return {err:'signature'}; }
  },
  // la clé privée correspond-elle à la clé publique ? (signe puis vérifie un texte d'essai)
  async pairOk(privJwk, pubJwk) {
    try { const p = {id:'test-0000', rid:'test#0000', plan:'premium', iat:'2026-01-01', exp:''}; return !!(await LIC.verify(pubJwk, await LIC.sign(privJwk, p))).p; } catch (e) { return false; }
  },
  // empreinte courte de la clé publique (8 caractères) : pour vérifier d'un coup d'œil que le site a la bonne clé
  async thumb(pubJwk) {
    const pub = jwkPub(pubJwk); if (!pub) return '';
    const h = new Uint8Array(await crypto.subtle.digest('SHA-256', utf8(pub.x + '.' + pub.y)));
    return [...h.slice(0, 4)].map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  },
  newId:() => 'L-' + [...crypto.getRandomValues(new Uint8Array(6))].map(b => b.toString(36).padStart(2, '0')).join('').slice(0, 10).toUpperCase()
};
