import { NextResponse } from 'next/server';
import { Bitcoin } from '../../../utils/bitcoin';
import { Wallet } from '../../../utils/near-wallet';

// Initialize Bitcoin client with testnet configuration
const bitcoin = new Bitcoin('https://mempool.space/testnet/api', 'testnet');


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
