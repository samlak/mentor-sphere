import React, { useState, useEffect } from "react";
import {
  copy,
  loader,
  tick,
  defaultImage,
  curious,
  download,
  search,
} from "../../assets";
import { useGetAnswerMutation, useGetArtsMutation } from "../../services";
import toast from "react-hot-toast";
import { auth, db } from "../../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore/lite";
import "./StudentTools.css";
import { MainLayout } from "../../layouts";
import { Header, SideCol } from "../../components";

export const FactGenerator = () => {
  const navigate = useNavigate();
  const [fact, setFact] = useState({
    prompt: "",
    facts: [],
    image: null,
  });
  const [allFacts, setAllFacts] = useState([]);
  const [copied, setCopied] = useState("");
  const [getFacts, { error, isLoading }] = useGetAnswerMutation();
  const [getArts, { error: imageError, isLoading: imageLoading }] =
    useGetArtsMutation();

  const [user, setUser] = useState(null);

  useEffect(() => {
    onAuthStateChanged(auth, (user_) => {
      setUser(user_);
      !user_ && navigate("/student/signin");
    });
  }, [user]);

  useEffect(() => {
    async function fetchData() {
      const querySnapshot = await getDocs(
        query(
          collection(db, "facts-generator"),
          where("userId", "==", user?.uid),
          orderBy("timestamp", "desc"),
          limit(50)
        )
      );
      const factsFromStorage = querySnapshot?.docs?.map((doc) => {
        if (doc != undefined) {
          return JSON.parse(doc?.data()?.history);
        }
      });
      if (factsFromStorage) {
        setAllFacts(factsFromStorage);
      }
    }
    if (user?.uid != undefined) {
      fetchData();
    }
  }, [user]);

  const saveHistory = async (history) => {
    try {
      await addDoc(collection(db, "facts-generator"), {
        userId: user?.uid,
        history: JSON.stringify(history),
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.log(error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const { data } = await getFacts({
        messages: [
          {
            role: "user",
            content: `Give 5 interesting / fascinating / mind blowing / fun facts about ${fact.prompt} [max 100 words]. Please give an array of facts in this format strictly: ["...", "...", "...", "...", "..."]`,
          },
        ],
      });

      const response = await getArts({
        prompt: fact.prompt,
      });

      const imageBase64 = response?.data?.data[0]?.b64_json;

      if (data?.choices[0]?.message && response) {
        const newFact = {
          ...fact,
          facts: JSON.parse(data.choices[0].message.content),
          image: imageBase64,
        };
        const updatedAllFacts = [newFact, ...allFacts];

        setFact(newFact);
        setAllFacts(updatedAllFacts);
        await saveHistory(newFact);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleCopy = (copyFacts) => {
    setCopied(copyFacts);
    navigator.clipboard.writeText(copyFacts);
    toast.success("Copied facts successfully!");
    setTimeout(() => setCopied(""), 3000);
  };

  const downloadImage = async (image, prompt) => {
    try {
      const link = document.createElement("a");
      link.href = `data:image/png;base64,${image}`;
      link.download = prompt;
      link.click();
      toast.success("Image downloaded successfully!");
    } catch (error) {
      toast.error("Error. Oops, that's unexpected!");
    }
  };

  return (
    <div className="flex gap-6">
      <SideCol side={"left"} />
      <MainLayout>
        <section id="visualizer" className="max-w-[720px] w-full mx-auto px-6">
          <Header
            title="Interesting Facts"
            title_="Generator"
            subtitle="Enter a topic or keyword that piques your curiosity, and we'll uncover fascinating facts and a captivating image to expand your knowledge and entertain your imagination!"
            tool={true}
          />
          <div className="flex flex-col w-full gap-2">
            <form
              className="relative flex justify-center items-center w-full"
              onSubmit={handleSubmit}
            >
              <img
                src={curious}
                alt="Curious Icon"
                className="absolute left-0 my-2 ml-3 w-5"
              />
              <input
                placeholder="Try searching for The Milky Way!"
                value={fact.prompt}
                onChange={(e) => {
                  setFact({ ...fact, prompt: e.target.value });
                }}
                required
                className="prompt_input peer"
              />
              <button
                type="submit"
                className="submit_btn peer-focus:border-gray-700 peer-focus:text-gray-700"
              >
                <img
                  src={search}
                  alt="Search Icon"
                  className="absolute left-0 my-2 mx-2 w-5"
                />
              </button>
            </form>
            <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
              {allFacts.map((item, index) => (
                <div
                  key={`link-${index}`}
                  onClick={() => setFact(item)}
                  className="prompt_card font-satoshi text-sm"
                >
                  <div className="flex gap-3 items-center">
                    <div key={index} className="image_card">
                      <img
                        src={`data:image/png;base64,${item.image}`}
                        alt={item.prompt}
                        className="w-full h-full object-cover rounded-md"
                      />
                    </div>
                    <div
                      className="copy_btn"
                      onClick={() => downloadImage(item.image, item.prompt)}
                    >
                      <img
                        src={download}
                        alt="Download Icon"
                        className="w-[50%] h-[50%] object-contain"
                      />
                    </div>
                    <span className="font-semibold">Facts:</span>{" "}
                    {`${item.facts[0].substring(0, 50)}...`}
                  </div>
                  <div
                    className="copy_btn"
                    onClick={() => handleCopy(item.facts)}
                  >
                    <img
                      src={copied === item.facts ? tick : copy}
                      alt="Copy Icon"
                      className="w-[50%] h-[50%] object-contain"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="my-10 max-w-full flex justify-center items-center">
            <div className="flex flex-col gap-3 w-full">
              <h2 className="font-satoshi font-bold text-gray-600 text-xl">
                {allFacts.length == 0 || fact.facts.length == 0
                  ? "Let's craft your very first masterpiece!"
                  : "Presenting you fascinating facts and captivating visuals!"}
                <span className="blue_gradient"></span>
              </h2>
              <div className="result_box">
                {isLoading || imageLoading ? (
                  <div className="w-full aspect-square flex justify-center items-center">
                    <img
                      src={loader}
                      alt="Loader"
                      className="w-20 h-20 object-contain"
                    />
                  </div>
                ) : error || imageError ? (
                  <div className="w-full aspect-square flex justify-center items-center">
                    <p className="font-inter font-bold text-black text-center">
                      Oops, that's unexpected! Give it another shot, and let's
                      see if the digital dice roll in your favor this time!
                    </p>
                  </div>
                ) : (
                  <div>
                    <ol className="list-decimal ml-[25px]">
                      {fact.facts?.map((item, index) => (
                        <li key={index} className="mb-2 font-satoshi">
                          {item.charAt(0).toUpperCase() + item.slice(1)}
                          {!item.endsWith(".") && "."}
                        </li>
                      ))}
                    </ol>
                    <img
                      src={
                        fact.facts?.length
                          ? `data:image/png;base64,${fact.image}`
                          : defaultImage
                      }
                      alt={fact.prompt}
                      className={`${
                        fact.facts?.length ? "mt-[24px]" : ""
                      } w-full aspect-square rounded-md object-cover`}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </MainLayout>
      <SideCol side={"right"} />
    </div>
  );
};
