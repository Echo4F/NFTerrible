import {
  Flex,
  Container,
  Heading,
  Image,
  SimpleGrid,
  Text,
  Button,
  Box,
  Divider,
} from "@chakra-ui/react";
import { ethers } from "ethers";
import { useEffect, useState } from "react";
import axios from "axios";
import Web3Modal from "web3modal";

import { nftaddress, nftmarketaddress } from "../.config";

import NFT from "../artifacts/contracts/NTF.sol/NFT.json";
import Market from "../artifacts/contracts/NFTMarket.sol/NFTMarket.json";

export default function Home() {
  const [nfts, setNfts] = useState([]);
  const [loadingState, setLoadingState] = useState("not-loaded");

  useEffect(() => {
    loadNfts();
  }, []);

  const loadNfts = async () => {
    const provider = new ethers.providers.JsonRpcProvider();
    const tokenContract = new ethers.Contract(nftaddress, NFT.abi, provider);
    const marketContract = new ethers.Contract(
      nftmarketaddress,
      Market.abi,
      provider
    );
    const data = await marketContract.fetchMarketItems();

    const items = await Promise.all(
      data.map(async (i) => {
        const tokenURI = await tokenContract.tokenURI(i.tokenId);
        const meta = await axios.get(tokenURI);
        let price = ethers.utils.formatUnits(i.price.toString(), "ether");
        let item = {
          price,
          tokenId: i.tokenId.toNumber(),
          seller: i.seller,
          owner: i.owner,
          image: meta.data.image,
          name: meta.data.name,
          description: meta.data.description,
        };
        return item;
      })
    );
    setNfts(items);
    setLoadingState("loaded");
  };

  const buyNft = async (nft) => {
    const web3Modal = new Web3Modal();
    const connection = await web3Modal.connect();
    const provider = new ethers.providers.Web3Provider(connection);

    const signer = provider.getSigner();
    const contract = new ethers.Contract(nftmarketaddress, Market.abi, signer);

    const price = ethers.utils.parseUnits(nft.price.toString(), "ether");

    const transaction = await contract.createMarketSale(
      nftaddress,
      nft.tokenId,
      {
        value: price,
      }
    );
    await transaction.wait();
    loadNfts();
  };

  if (loadingState === "loaded" && !nfts.length)
    return (
      <Container justifyContent="center" px={[5, 6]} maxW="container.xl" py={4}>
        <Heading> No Items in marketplace</Heading>
      </Container>
    );

  return (
    <Container justifyContent="center" px={[5, 6]} maxW="container.xl" py={4}>
      <SimpleGrid columns={[1, 4]} spacing={10}>
        {nfts.map((nft, i) => {
          console.log(nft.name);
          return (
            <Flex
              key={i}
              bg="white"
              backdropBlur="blur(64px)"
              // overflow="hidden"
              direction="column"
              fontSize="13px"
              borderRadius="lg"
              boxShadow="xl"
              key={i}
              color="white"
            >
              <Flex className="item-zoom" direction="column">
                <Image
                  overflow="hidden"
                  objectFit="cover"
                  h="200px"
                  borderTopRadius="lg"
                  src={nft.image}
                />
              </Flex>

              <Flex p={4} direction="column">
                <Text
                  fontWeight="semibold"
                  fontSize="2xl"
                  h="64px"
                  color="black"
                >
                  {nft.name}
                </Text>
                <Flex h="70px" overflow="hidden" direction="column">
                  <Text fontSize="sm" h="64px" color="gray.400">
                    {nft.description}
                  </Text>
                </Flex>
              </Flex>
              <Flex direction="column" p={4} bg="black">
                <Text fontSize="2xl" mb={4} fontWeight="bold" color="white">
                  {nft.price} Matic
                </Text>
                <Button
                  w="full"
                  bg="pink.500"
                  color="white"
                  fontWeight="bold"
                  py={2}
                  px={12}
                  onClick={() => buyNft(nft)}
                >
                  Buy
                </Button>
              </Flex>
            </Flex>
          );
        })}
      </SimpleGrid>
    </Container>
  );
}
