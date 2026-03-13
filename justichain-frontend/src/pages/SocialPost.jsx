import { useEffect, useState } from "react";
import axios from "axios";

function SocialPost() {

  const caseId = window.location.pathname.split("/")[2];

  const [postText, setPostText] = useState("");

  useEffect(() => {

    axios.get(`http://localhost:5000/api/social/${caseId}`)
    .then(res => setPostText(res.data.post));

  }, [caseId]);

  const copyPost = () => {

    navigator.clipboard.writeText(postText);

    alert("Post copied!");

  };

  return (

    <div style={{padding:"20px"}}>

      <h2>Social Media Post</h2>

      <textarea
        value={postText}
        rows="8"
        style={{width:"100%"}}
        readOnly
      />

      <br/><br/>

      <button onClick={copyPost}>
        Copy Post
      </button>

    </div>

  );

}

export default SocialPost;