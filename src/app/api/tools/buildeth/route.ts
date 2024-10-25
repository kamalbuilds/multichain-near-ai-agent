import { NextResponse } from 'next/server';
import { Ethereum } from '../../../utils/ethereum';
import { Wallet } from '../../../utils/near-wallet';
import { deriveChildPublicKey, najPublicKeyStrToUncompressedHexPoint, uncompressedHexPointToEvmAddress } from '../../../utils/kdf';

const ethereum = new Ethereum('https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID', 'sepolia');
const wallet = new Wallet({ networkId: 'testnet', createAccessKeyFor: process.env.CONTRACT_NAME! });

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sender = searchParams.get('sender');
    const receiver = searchParams.get('receiver');
    const amount = searchParams.get('amount');
    const data = searchParams.get('data') || '0x';
    const accountId = searchParams.get('accountId');
    const path = searchParams.get('path') || '';

    if (!sender || !receiver || !amount || !accountId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Derive Ethereum address
    const { address: derivedAddress } = await ethereum.deriveAddress(accountId, path);

    if (derivedAddress.toLowerCase() !== sender.toLowerCase()) {
      return NextResponse.json({ error: 'Derived address does not match sender' }, { status: 400 });
    }

    // Create transaction payload
    const { payload } = await ethereum.createPayload(sender, receiver, amount, data);

    // Request signature from MPC
    const { big_r, s, recovery_id } = await ethereum.requestSignatureToMPC(wallet, process.env.CONTRACT_NAME!, path, payload);

    // Reconstruct and verify signature
    const signedTransaction = await ethereum.reconstructSignatureFromLocalSession(big_r, s, recovery_id, sender);

    // Relay transaction
    const txHash = await ethereum.relayTransaction(signedTransaction);

    return NextResponse.json({ txHash });
  } catch (error) {
    console.error('Error building and executing EVM transaction:', error);
    return NextResponse.json({ error: 'Failed to build and execute EVM transaction' }, { status: 500 });
  }
}
