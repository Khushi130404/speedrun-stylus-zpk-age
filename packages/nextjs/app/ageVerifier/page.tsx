import { DebugAgeVerifier } from "./_components/AgeVerifier";
import type { NextPage } from "next";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

export const metadata = getMetadata({
  title: "Age Verifier",
  description: "Verify your age using ZKP",
});

const Debug: NextPage = () => {
  return (
    <>
      <DebugAgeVerifier />
    </>
  );
};

export default Debug;
