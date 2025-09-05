import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../BACKEND/COMPONENTS/navbar";
import { useUser } from "../../BACKEND/context/UserContext";
import "./Styles/CreateGroup.css";
import feedImage from "../Images/category.png";
import friendsImage from "../Images/friends.png";
import eventImage from "../Images/event.png";
import photosImage from "../Images/gallery.png";

const CreateGroup: React.FC = () => {
  const { userId, token } = useUser();
  const navigate = useNavigate();
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupImage, setGroupImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [showPostForm, setShowPostForm] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [postMedia, setPostMedia] = useState<File | null>(null);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setGroupImage(file);

    // Preview image
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };
  

  const handleCreateGroup = async () => {
    if (!groupName || !groupDescription || !token || !userId) {
      setStatus("Please fill in all required fields.");
      return;
    }

    setStatus("Creating group...");
    const formData = new FormData();
    formData.append("name", groupName);
    formData.append("description", groupDescription);
    if (groupImage) formData.append("groupImage", groupImage);

    try {
      const res = await fetch(`http://localhost:5000/groups/create/${userId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to create group");
      const data = await res.json();
      console.log("Group created:", data);
      setStatus("Group created successfully!");

      // Reset form
      setGroupName("");
      setGroupDescription("");
      setGroupImage(null);
      setPreview(null);

      // Redirect to the group's page
      navigate(`/group/${data._id}`);
    } catch (err) {
      console.error(err);
      setStatus("Error creating group. Please try again.");
    }
  };

  return (
    <>
      <Navbar />
      <div className="create-group-page-container">
        {/* LEFT */}
        <div className="left-side-wrapper-create-group">
          <div className="social-buttons-container-create-group">
            <ul>
              <li onClick={() => navigate('/')}>
                <img src={feedImage} alt="Feed" />
                <span>Feed</span>
              </li>
              <li>
                <img src={friendsImage} alt="Friends" />
                <span>Friends</span>
              </li>
              <li>
                <img src={eventImage} alt="Events" />
                <span>Events</span>
              </li>
              <li>
                <img src={photosImage} alt="Photos" />
                <span>Photos</span>
              </li>
              <li className="active">
                <img src={eventImage} alt="Create Group" />
                <span>Create Group</span>
              </li>
            </ul>
          </div>
        </div>

        {/* CENTER */}
        <div className="center-wrapper-create-group">
          <h2>Create a New Group</h2>
          <div className="create-group-form">
            <input
              type="text"
              placeholder="Group Name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
            <textarea
              placeholder="Group Description"
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
            />
            <input type="file" accept="image/*" onChange={handleFileChange} />
            {preview && (
              <div className="group-image-preview">
                <img src={preview} alt="Group Preview" />
              </div>
            )}
            <button
              onClick={handleCreateGroup}
              disabled={!groupName || !groupDescription}
            >
              Create Group
            </button>
            {status && <p className="status-message">{status}</p>}
          </div>
        </div>

        {/* RIGHT */}
        <div className="right-side-wrapper-create-group">
          <h4>Tips for Groups</h4>
          <ul>
            <li>Pick a clear, unique name</li>
            <li>Add a description so people know what it's about</li>
            <li>Upload an image to make it stand out</li>
          </ul>
        </div>
      </div>
    </>
  );
};

export default CreateGroup;