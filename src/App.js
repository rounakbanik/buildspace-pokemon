import './styles/App.css';
import twitterLogo from './assets/twitter-logo.svg';
import React, { useCallback, useEffect, useState } from "react";
import pokemonImg from './assets/pokemon.jpeg';
import { ethers } from 'ethers';
import contract from './contracts/PokemonNFT.json'
import { Fragment } from 'react/cjs/react.production.min';
import { AlchemyProvider } from "@ethersproject/providers";

// Constants
const TWITTER_HANDLE = 'Rounak_Banik';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;
const OPENSEA_LINK = 'https://testnets.opensea.io/collection/buildspace-pokemon';
const contractAddress = "0xA72D2F4172ad22Adc5E0cb742230c32afDc3624b";
const abi = contract.abi;

const App = () => {

  const [currentAccount, setCurrentAccount] = useState(null);
  const [metamaskError, setMetamaskError] = useState(null);
  const [mineStatus, setMineStatus] = useState(null);
  const [tokenId, setTokenId] = useState(null);
  const [hunters, setHunters] = useState([]);

  const checkWalletIsConnected = async () => {
    const { ethereum } = window;

    if (!ethereum) {
      console.log("Make sure you have Metamask installed!");
      return;
    } else {
      console.log("Wallet exists! We're ready to go!")
    }

    const accounts = await ethereum.request({ method: 'eth_accounts' });
    const network = await ethereum.request({ method: 'eth_chainId' });

    if (accounts.length !== 0 && network.toString() === '0x4') {
      const account = accounts[0];
      console.log("Found an authorized account: ", account);
      setMetamaskError(false);
      setCurrentAccount(account);
      //setupEventListener();
    } else {
      setMetamaskError(true);
      console.log("No authorized account found");
    }
  }

  const connectWallet = async () => {
    const { ethereum } = window;

    if (!ethereum) {
      alert("Please install Metamask!");
    }

    try {
      const network = await ethereum.request({ method: 'eth_chainId' });

      if (network.toString() === '0x4') {
        const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
        console.log("Found an account! Address: ", accounts[0]);
        setMetamaskError(null);
        setCurrentAccount(accounts[0]);
        //setupEventListener();
      }

      else {
        setMetamaskError(true);
      }

    } catch (err) {
      console.log(err)
    }
  }

  // Setup our listener.
  const setupEventListener = async () => {
    // Most of this looks the same as our function askContractToMintNft
    try {
      const { ethereum } = window;

      if (ethereum) {
        // Same stuff again
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const connectedContract = new ethers.Contract(contractAddress, abi, signer);

        // THIS IS THE MAGIC SAUCE.
        // This will essentially "capture" our event when our contract throws it.
        // If you're familiar with webhooks, it's very similar to that!
        connectedContract.on("NewPokemonNFTMinted", (from, tokenId) => {
          console.log(from, tokenId.toNumber())
          setTokenId(tokenId);
          //alert(`Hey there! We've minted your NFT and sent it to your wallet. It may be blank right now. It can take a max of 10 min to show up on OpenSea. Here's the link: https://testnets.opensea.io/assets/${contractAddress}/${tokenId.toNumber()}`)
        });

        console.log("Setup event listener!")

      } else {
        console.log("Ethereum object doesn't exist!");
      }
    } catch (error) {
      console.log(error)
    }
  }

  const getShinyHunters = useCallback(async () => {

    // Use user account if it is connected to Rinkeby, else use default Alchemy Provider
    let signer;

    if (currentAccount) {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      signer = provider.getSigner();
    }
    else {
      signer = new AlchemyProvider('rinkeby')
    }

    const nftContract = new ethers.Contract(contractAddress, abi, signer);

    let shinyHunters = await nftContract.getShinyHunters();

    let cleanHunters = shinyHunters.map(hunter => {
      return {
        winner: hunter.winner,
        species: hunter.pokemon,
      }
    })

    cleanHunters.reverse();
    console.log(cleanHunters);
    setHunters(cleanHunters);
  }, [currentAccount]);

  const mintNFT = async () => {
    try {

      setMineStatus('mining');

      const { ethereum } = window;

      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const nftContract = new ethers.Contract(contractAddress, abi, signer);

        console.log("Initialize payment");
        let nftTxn = await nftContract.mintNFT();

        console.log("Mining... please wait");
        await nftTxn.wait();

        console.log(`Mined, see transaction: https://rinkeby.etherscan.io/tx/${nftTxn.hash}`);
        setMineStatus('success');

      } else {
        setMineStatus('error');
        console.log("Ethereum object does not exist");
      }

    } catch (err) {
      setMineStatus('error');
      console.log(err);
    }
  }

  useEffect(() => {
    checkWalletIsConnected();
    getShinyHunters();

    if (currentAccount) {
      setupEventListener();
    }
    if (window.ethereum) {
      window.ethereum.on('chainChanged', (_chainId) => window.location.reload());
    }
  }, [currentAccount, getShinyHunters])

  // Render Methods
  const renderNotConnectedContainer = () => (
    <button onClick={connectWallet} className="cta-button connect-wallet-button">
      Connect to Wallet
    </button>
  );

  const renderMintUI = () => {
    return (
      <button onClick={mintNFT} className="cta-button connect-wallet-button" >
        Mint NFT
      </button >
    );
  }

  return (
    <Fragment>
      {metamaskError && <div className='metamask-error'>Please make sure you are connected to the Rinkeby Network on Metamask!</div>}
      <div className="App">



        <div className="container">
          <div className="header-container">
            <p className="header gradient-text"><a href={OPENSEA_LINK} target='_blank' rel='noreferrer'>_buildspace Pokemon</a></p>
            <div className='banner-img'>
              <img src={pokemonImg} alt="Groudon and Kyogre" />
            </div>
            <p className="sub-text">
              Mint your own Pokemon NFT. <br />Catch a shiny and get a chance to win 0.01 ETH!
            </p>
            {currentAccount && mineStatus !== 'mining' && renderMintUI()}
            {!currentAccount && !mineStatus && renderNotConnectedContainer()}
            <div className='mine-submission'>
              {mineStatus === 'success' && <div className={mineStatus}>
                <p>NFT minting successful!</p>
                {tokenId && <p className='success-link'>
                  <a href={`https://testnets.opensea.io/assets/${contractAddress}/${tokenId.toNumber()}`} target='_blank' rel='noreferrer'>Click here</a>
                  <span> to view your NFT on OpenSea.<br /> (It may take up to 10 minutes for your NFT to generate)</span>
                </p>}
              </div>}
              {mineStatus === 'mining' && <div className={mineStatus}>
                <div className='loader' />
                <span>Transaction is mining</span>
              </div>}
              {mineStatus === 'error' && <div className={mineStatus}>
                <p>Transaction failed. Please try again.</p>
              </div>}
            </div>
          </div>

          <div className='shiny-hunter-container'>
            <h2>Shiny Hunters Hall of Fame</h2>
            {hunters.length === 0 && <p>No shinies have been hunted yet.</p>}
            {hunters.map(hunter => {
              return (
                <div className='hunter'>
                  <p className='hspecies'>{hunter.species}</p>
                  <p className='haddress'>{hunter.winner}</p>
                </div>
              )
            })}
          </div>


          <div className="footer-container">
            <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
            <a
              className="footer-text"
              href={TWITTER_LINK}
              target="_blank"
              rel="noreferrer"
            >{`built by @rounak_banik`}</a>
          </div>
        </div>
      </div>
    </Fragment>
  );
};

export default App;
