import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Navbar from "../../BACKEND/COMPONENTS/navbar";
import { useUser } from "../../BACKEND/context/UserContext";
import "./Styles/GroupPage.css";

interface Member {
  user: {
    _id: string;
    username: string;
    profilePhoto?: string;
  };
  role: string;
}

interface GroupPost {
  _id: string;
  author: { username: string; profilePhoto?: string };
  content: string;
  media?: { url: string; mediaType: string }[];
  createdAt: string;
}

interface JoinRequest {
  user: { _id: string; username: string };
  requestedAt?: string;
}

interface Group {
  _id: string;
  name: string;
  description: string;
  profileImage?: { url: string };
  members: Member[];
  joinRequests: JoinRequest[];
  createdBy: string;
}

const GroupPage: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const { userId, token } = useUser();
  const [group, setGroup] = useState<Group | null>(null);
  const [posts, setPosts] = useState<GroupPost[]>([]);
  const [joined, setJoined] = useState(false);
  const [requested, setRequested] = useState(false);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const fetchGroup = async () => {
      try {
        const res = await fetch(`http://localhost:5000/groups/${groupId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Group not found");
        const currentGroup: Group = await res.json();
        setGroup(currentGroup);

        setJoined(currentGroup.members.some((m) => m.user._id === userId));
        setRequested(currentGroup.joinRequests.some((r) => r.user._id === userId));

        const postsRes = await fetch(`http://localhost:5000/groups/${groupId}/posts`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const groupPosts: GroupPost[] = await postsRes.json();
        setPosts(groupPosts);
      } catch (err) {
        console.error(err);
        setStatus("Failed to load group data.");
      } finally {
        setLoading(false);
      }
    };

    fetchGroup();
  }, [groupId, userId, token]);

  const handleJoinLeave = async () => {
    if (!group) return;
    try {
      let url = "";
      if (joined) url = `http://localhost:5000/groups/${group._id}/leave`;
      else if (!joined && !requested) url = `http://localhost:5000/groups/${group._id}/request`;
      else return; // pending request, do nothing for now

      const res = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Action failed");

      if (joined) {
        setJoined(false);
        setGroup((prev) =>
          prev ? { ...prev, members: prev.members.filter((m) => m.user._id !== userId) } : prev
        );
        setStatus("You left the group");
      } else if (!joined && !requested) {
        setRequested(true);
        setStatus("Join request sent");
      }
    } catch (err) {
      console.error(err);
      setStatus("Action failed. Try again.");
    }
  };

  const handleAcceptRequest = async (requestUserId: string) => {
    if (!group) return;
    try {
      const res = await fetch(`http://localhost:5000/groups/${group._id}/accept/${requestUserId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to accept request");
      const data = await res.json();
      setGroup(data.group);
      setStatus("User added to the group");
    } catch (err) {
      console.error(err);
      setStatus("Failed to accept request");
    }
  };

  if (loading) return <p>Loading group...</p>;
  if (!group) return <p>Group not found.</p>;

  const isOwner = group.members.some((m) => m.user._id === userId && m.role === "owner");

  return (
    <>
      <Navbar />
      <div className="group-page-container">
        {/* LEFT */}
        <div className="left-sidebar-group">
          <h4>Members</h4>
          <ul>
            {group.members.map((m) => (
              <li key={m.user._id}>
                <img src={m.user.profilePhoto || "/default-avatar.png"} alt={m.user.username} />
                <span>
                  {m.user.username} {m.role === "owner" && "(Owner)"}
                </span>
              </li>
            ))}
          </ul>

          {/* Owner view: pending requests */}
          {isOwner && group.joinRequests.length > 0 && (
            <>
              <h4>Join Requests</h4>
              <ul>
                {group.joinRequests.map((r) => (
                  r.user ? (
                    <li key={r.user._id}>
                      {r.user.username}
                      <button onClick={() => handleAcceptRequest(r.user._id)}>Accept</button>
                    </li>
                  ) : null
                ))}
              </ul>
            </>
          )}
        </div>

        {/* CENTER */}
        <div className="center-group">
          <div className="group-header">
            {group.profileImage && <img src={group.profileImage.url} alt={group.name} />}
            <h2>{group.name}</h2>
            <p>{group.description}</p>
            <button onClick={handleJoinLeave}>
              {joined ? "Leave Group" : requested ? "Request Pending" : "Request to Join"}
            </button>
            {status && <p className="status-message">{status}</p>}
          </div>

          <div className="group-posts">
            <h3>Posts</h3>
            {posts.length === 0 && <p>No posts yet.</p>}
            {posts.map((post) => (
              <div key={post._id} className="group-post">
                <div className="post-author">
                  <img src={post.author.profilePhoto || "/default-avatar.png"} alt={post.author.username} />
                  <span>{post.author.username}</span>
                  <span className="post-date">{new Date(post.createdAt).toLocaleString()}</span>
                </div>
                <p>{post.content}</p>
                {post.media &&
                  post.media.map((m, idx) =>
                    m.mediaType.startsWith("image") ? (
                      <img key={idx} src={m.url} alt="post media" />
                    ) : (
                      <video key={idx} controls src={m.url}></video>
                    )
                  )}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT */}
        <div className="right-sidebar-group">
          <h4>Group Info</h4>
          <p>Created by: {group.members.find((m) => m.role === "owner")?.user.username}</p>
          <p>Total Members: {group.members.length}</p>
        </div>
      </div>
    </>
  );
};

export default GroupPage;
