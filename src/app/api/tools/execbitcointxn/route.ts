import { NextResponse } from 'next/server';
import { Bitcoin } from '../../../utils/bitcoin';
import { Wallet } from '../../../utils/near-wallet';

// Initialize Bitcoin client with testnet configuration
const bitcoin = new Bitcoin('https://mempool.space/testnet/api', 'testnet');

export async function POST(request: Request) {
  try {
    const { path, to, amount } = await request.json();

    if (!path || !to || !amount) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const wallet = new Wallet({ networkId: 'testnet' });

    // Derive Bitcoin address from path
    const { address: derivedAddress, publicKey } = await bitcoin.deriveAddress('near', path);
    
    // Get balance
    const balance = await bitcoin.getBalance(derivedAddress);

    // Create transaction payload
    const satoshis = Bitcoin.toSatoshi(amount);
    const btcPayload = await bitcoin.createPayload(derivedAddress, to, satoshis);

    // Sign and broadcast transaction
    const signedTx = await bitcoin.requestSignatureToMPC(
      wallet,
      process.env.CONTRACT_ID!, // Make sure this env variable is set
      path,
      btcPayload,
      publicKey
    );

    const txHash = await bitcoin.relayTransaction(signedTx);

    return NextResponse.json({
      txHash,
      derivedAddress,
      balance: Bitcoin.toBTC(balance),
      tx: btcPayload
    });
  } catch (error) {
    console.error('Error executing Bitcoin transaction:', error);
    return NextResponse.json({ error: 'Failed to execute Bitcoin transaction' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');

    if (!path) {
      return NextResponse.json({ error: 'Path parameter is required' }, { status: 400 });
    }

    // Derive Bitcoin address from path
    const { address: derivedAddress } = await bitcoin.deriveAddress('near', path);
    
    // Get balance
    const balance = await bitcoin.getBalance(derivedAddress);

    return NextResponse.json({
      derivedAddress,
      balance: Bitcoin.toBTC(balance)
    });
  } catch (error) {
    console.error('Error getting Bitcoin address and balance:', error);
    return NextResponse.json({ error: 'Failed to get Bitcoin address and balance' }, { status: 500 });
  }
}
