const {
    Connection,
    Keypair,
    PublicKey,
    clusterApiUrl,
  } = require("@solana/web3.js");
  const {
    createMint,
    getOrCreateAssociatedTokenAccount,
    mintTo,
    getMint,
  } = require("@solana/spl-token");
  const { Metaplex, keypairIdentity, bundlrStorage } = require("@metaplex-foundation/js");
  
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
    console.log("Connected to Devnet");
  
    // Load the pre-funded payer wallet
    const payer = Keypair.fromSecretKey(PRIVATE_KEY);
    console.log("Using pre-funded wallet:", payer.publicKey.toString());
  
    // Skip airdrop since the wallet is already funded
    console.log("Skipping airdrop since payer is already funded.");
  
    // Generate a new keypair for the mint authority
    const mintAuthority = Keypair.generate();
    console.log("Generated mint authority:", mintAuthority.publicKey.toString());
  
    // Create a new SPL Token
    const decimals = 6; // Number of decimal places
    const mint = await createMint(
      connection,
      payer,
      mintAuthority.publicKey,
      null,
      decimals
    );
    console.log("Token created with Mint Address:", mint.toString());
  
    // Add metadata to the token
    const metaplex = Metaplex.make(connection)
      .use(keypairIdentity(payer))
      .use(bundlrStorage());
  
    const metadataUri = "https://arweave.net/your-arweave-link"; // Replace with your own hosted metadata JSON URI
  
    const { nft } = await metaplex.nfts().create({
      uri: metadataUri, // Metadata JSON link (hosted on Arweave or IPFS)
      name: "THANOS", // Token Name
      symbol: "THANOS", // Token Symbol
      sellerFeeBasisPoints: 0, // No royalties for this token
      creators: [
        {
          address: payer.publicKey,
          verified: true,
          share: 100, // 100% ownership
        },
      ],
      mintAddress: mint,
    });
    console.log("Metadata added. NFT created:", nft.address.toString());
  
    // Replace this with the recipient's public key string
    const recipientPublicKey = new PublicKey(
      "7nRhjsgE8RXSyKZojMjVFmf6fqbyZsX3wLTiHTi1YLv1"
    );
    console.log("Recipient Public Key:", recipientPublicKey.toString());
  
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
    console.log("Minting", amount / 10 ** decimals, "tokens to recipient...");
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
  
    // Verify the recipient's balance after minting
    try {
      const updatedAccountInfo = await getAccount(
        connection,
        recipientTokenAccount.address
      );
      console.log("Updated Recipient Account Info:", {
        amount: updatedAccountInfo.amount.toString(),
      });
    } catch (error) {
      console.error("Failed to fetch updated Recipient Account Info:", error.message);
    }
  })();
  