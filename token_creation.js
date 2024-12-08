const {
  Connection,
  Keypair,
  PublicKey,
  clusterApiUrl,
  Transaction,
  sendAndConfirmTransaction,
} = require("@solana/web3.js");
const { createMint, getOrCreateAssociatedTokenAccount, mintTo } = require("@solana/spl-token");
const {
  createCreateMetadataAccountV3Instruction,
  PROGRAM_ID,
} = require('@metaplex-foundation/mpl-token-metadata');

const fs = require('fs');
const path = require('path');

// Function to read private key from file
function readPrivateKeyFromFile(filename) {
  try {
    const privateKeyText = fs.readFileSync(path.join(__dirname, filename), 'utf8');
    // Remove brackets, newlines, and extra spaces, then split by comma
    const privateKeyArray = privateKeyText
      .replace(/[\[\]\n\s]/g, '') // Remove brackets, newlines, and whitespace
      .split(',')
      .map(num => parseInt(num.trim()))
      .filter(num => !isNaN(num));
    
    if (privateKeyArray.length !== 64) {
      throw new Error('Private key must be exactly 64 bytes');
    }
    
    return Uint8Array.from(privateKeyArray);
  } catch (error) {
    console.error('Error reading private key:', error);
    process.exit(1);
  }
}

// Use the function to read the private key
const PRIVATE_KEY = readPrivateKeyFromFile('private_key.txt');

(async () => {
  // Connect to the devnet
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

  // Load the pre-funded payer wallet
  const payer = Keypair.fromSecretKey(PRIVATE_KEY);

  // Generate a new keypair for the mint authority
  const mintAuthority = Keypair.generate();

  // Create a new SPL Token
  const decimals = 6; // Number of decimal places
  const mint = await createMint(
    connection,
    payer,
    mintAuthority.publicKey,
    null,
    decimals
  );

  console.log("Token created:", mint.toString());

  // Replace this with the recipient's public key string
  const recipientPublicKey = new PublicKey(
    "7nRhjsgE8RXSyKZojMjVFmf6fqbyZsX3wLTiHTi1YLv1"
  );

  // Create an associated token account for the recipient
  const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    recipientPublicKey
  );

  console.log(
    "Recipient's Token Account Address:",
    recipientTokenAccount.address.toString()
  );

  // Mint tokens to the recipient's token account
  const amount = 809000 * 10 ** decimals; // Adjust the amount as needed
  await mintTo(
    connection,
    payer,
    mint,
    recipientTokenAccount.address,
    mintAuthority,
    amount
  );

  console.log(
    `Minted ${amount / 10 ** decimals} tokens to recipient's token account`
  );

  // Create metadata for the token
  const metadataPDA = await PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    PROGRAM_ID
  );
  let uri = "https://raw.githubusercontent.com/dgodolias/cryptocreate/refs/heads/main/token_metadata.json";
  let info;

  try {
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    info = await response.json();
      console.log("Fetched metadata:", info);

    try {
      const metadataInstruction = createCreateMetadataAccountV3Instruction(
        {
          metadata: metadataPDA[0],
          mint: mint,
          mintAuthority: mintAuthority.publicKey,
          payer: payer.publicKey,
          updateAuthority: mintAuthority.publicKey,
        },
        {
          createMetadataAccountArgsV3: {
            data: {
              name: info.name,
              symbol: info.symbol,
              uri: uri,
              sellerFeeBasisPoints: 0,
              creators: null,
              collection: null,
              uses: null,
            },
            isMutable: true,
            collectionDetails: null,
          },
        }
      );

      const transaction = new Transaction().add(metadataInstruction);
      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [payer, mintAuthority],
        { commitment: 'confirmed' }
      );

      console.log("Metadata created for token. Signature:", signature);
    } catch (error) {
      console.error("Error creating metadata:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error fetching metadata:", error);
    throw error;
  }
})();
