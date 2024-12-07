const {
  Connection,
  Keypair,
  PublicKey,
  clusterApiUrl,
} = require("@solana/web3.js");
const { createMint, getOrCreateAssociatedTokenAccount, mintTo } = require("@solana/spl-token");
const { programs } = require('@metaplex/js');

const { Metadata } = programs.metadata;

// Correct private key: Ensure this is 64 bytes
const PRIVATE_KEY = Uint8Array.from([
  58, 186, 198, 199, 41, 163, 126, 87, 52, 68, 1, 237, 221, 182, 217, 93,
  10, 65, 8, 161, 135, 111, 250, 212, 228, 237, 248, 14, 61, 151, 121, 85,
  100, 201, 48, 102, 48, 12, 150, 56, 194, 223, 133, 171, 75, 152, 191, 145,
  213, 133, 82, 163, 164, 8, 197, 182, 251, 46, 39, 94, 199, 254, 154, 166,
]);

(async () => {
  // Connect to the devnet
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

  // Load the pre-funded payer wallet
  const payer = Keypair.fromSecretKey(PRIVATE_KEY);
  console.log("Using pre-funded wallet:", payer.publicKey.toString());

  // Skip airdrop since the wallet is already funded
  console.log("Skipping airdrop since payer is already funded.");

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
  const amount = 1000 * 10 ** decimals; // Adjust the amount as needed
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
  const metadataPDA = await Metadata.getPDA(mint);
  const metadataData = new MetadataDataData({
    name: "My Token Name",
    symbol: "MTK",
    uri: "https://example.com/token-metadata.json", // Replace with your metadata URI
    sellerFeeBasisPoints: 0,
    creators: null,
  });

  const metadataTransaction = new Transaction().add(
    Metadata.createCreateMetadataAccountV2Instruction(
      {
        metadata: metadataPDA,
        mint: mint,
        mintAuthority: mintAuthority.publicKey,
        payer: payer.publicKey,
        updateAuthority: mintAuthority.publicKey,
      },
      {
        createMetadataAccountArgsV2: {
          data: metadataData,
          isMutable: true,
        },
      }
    )
  );

  await sendAndConfirmTransaction(connection, metadataTransaction, [payer, mintAuthority]);

  console.log("Metadata created for token");
})();