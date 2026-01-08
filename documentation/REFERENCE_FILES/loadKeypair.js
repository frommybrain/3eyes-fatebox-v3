const { Keypair } = require('@solana/web3.js');

let kp;                                     

module.exports = function getDeployKeypair() {
  if (kp) return kp;

  const b64 = process.env.DEPLOY_WALLET_B64;
  if (!b64) throw new Error('DEPLOY_WALLET_B64 env-var missing');

  let secret;
  try {
    const jsonTxt = Buffer.from(b64, 'base64').toString('utf8');
    secret = JSON.parse(jsonTxt);
    if (!Array.isArray(secret) || secret.length !== 64)
      throw new Error('invalid array length');
  } catch (e) {
    throw new Error(`DEPLOY_WALLET_B64 is not valid base64-JSON: ${e.message}`);
  }

  kp = Keypair.fromSecretKey(new Uint8Array(secret));
  return kp;
};
