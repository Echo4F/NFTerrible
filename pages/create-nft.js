import { useState } from "react";
import { ethers } from "ethers";
import { nftaddress, nftmarketaddress } from "../.config";
import NFT from "../artifacts/contracts/NTF.sol/NFT.json";
import Market from "../artifacts/contracts/NFTMarket.sol/NFTMarket.json";

import Web3Modal from "web3modal";
import { create as ipfsHttpClient } from "ipfs-http-client";
const client = ipfsHttpClient("https://ipfs.infura.io:5001/api/v0");
import { useRouter } from "next/dist/client/router";

import {
  Button,
  Input,
  Textarea,
  Image,
  Container,
  Heading,
  Stack,
  FormControl,
  FormLabel,
} from "@chakra-ui/react";

const createItemPage = () => {
  const router = useRouter();

  const [fileUrl, setFileUrl] = useState(null);
  const [formInput, setFormInput] = useState({
    price: "",
    name: "",
    description: "",
  });

  async function onChange(e) {
    const file = e.target.files[0];
    try {
      const added = await client.add(file, {
        progress: (prog) => console.log(`received: ${prog}`),
      });
      const url = `https://ipfs.infura.io/ipfs/${added.path}`;
      setFileUrl(url);
    } catch (error) {
      console.log("Error uploading file: ", error);
    }
  }
  async function createMarket() {
    const { name, description, price } = formInput;
    if (!name || !description || !price || !fileUrl) return;
    /* first, upload to IPFS */
    const data = JSON.stringify({
      name,
      description,
      image: fileUrl,
    });
    try {
      const added = await client.add(data);
      const url = `https://ipfs.infura.io/ipfs/${added.path}`;
      /* after file is uploaded to IPFS, pass the URL to save it on Polygon */
      createSale(url);
    } catch (error) {
      console.log("Error uploading file: ", error);
    }
  }

  async function createSale(url) {
    const web3Modal = new Web3Modal();
    const connection = await web3Modal.connect();
    const provider = new ethers.providers.Web3Provider(connection);
    const signer = provider.getSigner();

    /* next, create the item */
    let contract = new ethers.Contract(nftaddress, NFT.abi, signer);
    let transaction = await contract.createToken(url);
    let tx = await transaction.wait();
    let event = tx.events[0];
    let value = event.args[2];
    let tokenId = value.toNumber();

    const price = ethers.utils.parseUnits(formInput.price, "ether");

    /* then list the item for sale on the marketplace */
    contract = new ethers.Contract(nftmarketaddress, Market.abi, signer);
    let listingPrice = await contract.getListingPrice();
    listingPrice = listingPrice.toString();

    transaction = await contract.createMarketItem(nftaddress, tokenId, price, {
      value: listingPrice,
    });
    await transaction.wait();
    router.push("/");
  }
  console.log(formInput);
  return (
    <Container justifyContent="center" px={[5, 6]} maxW="container.xl" py={4}>
      <Heading mb={8} as="h3">
        Create Nft
      </Heading>
      <Stack color="black" spacing={6} m="auto" maxW="600px">
        <Input
          bgColor="white"
          placeholder="Asset Name"
          p={4}
          onChange={(e) => setFormInput({ ...formInput, name: e.target.value })}
        />

        <Textarea
          bgColor="white"
          placeholder="Asset Description"
          p={4}
          onChange={(e) =>
            setFormInput({ ...formInput, description: e.target.value })
          }
        />
        <Input
          type="number"
          bgColor="white"
          placeholder="Asset Price in Matic"
          p={4}
          onChange={(e) =>
            setFormInput({ ...formInput, price: e.target.value })
          }
        />
        <Input border="none" type="file" name="Asset" onChange={onChange} />
        {fileUrl && <Image rounded mt={4} width="350" src={fileUrl} />}
        <Button
          onClick={createMarket}
          fontWeight="bold"
          bg="pink.500"
          color="white"
          borderRadius="lg"
          p={4}
          boxShadow="lg"
        >
          Create Digital Asset
        </Button>
      </Stack>
    </Container>
  );
};

export default createItemPage;
