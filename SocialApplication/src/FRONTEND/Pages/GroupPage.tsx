import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import Navbar from "../../BACKEND/COMPONENTS/navbar";
import { useUser } from "../../BACKEND/context/UserContext";
import "./Styles/GroupPage.css";

interface Member {
  user: {
    _id: string;
    username: string;
    profilePhoto?: { url: string; publicId: string };
  };
  role: string;
}

interface Comment {
  _id: string;
  user: {
    username: string;
    profilePhoto?: { url: string; publicId: string };
  };
  text: string;
  createdAt: string;
}

interface GroupPost {
  _id: string;
  author: {
    username: string;
    profilePhoto?: { url: string; publicId: string };
  };
  content: string;
  media?: { url: string; mediaType: string }[];
  createdAt: string;
  likes: (string | null)[];
  comments: Comment[];
}

interface JoinRequest {
  user: {
    _id: string;
    username: string;
    profilePhoto?: { url: string; publicId: string };
  };
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
  const [commentInputs, setCommentInputs] = useState<{ [key: string]: string }>({});
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostMedia, setNewPostMedia] = useState<File | null>(null);

  // Ref to track scroll position
  const postsContainerRef = useRef<HTMLDivElement>(null);
  const [lastPostCount, setLastPostCount] = useState(0);

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

        // Sort posts by creation date - newest first
        const sortedPosts = groupPosts.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        setPosts(sortedPosts);
        setLastPostCount(sortedPosts.length);
      } catch (err) {
        console.error(err);
        setStatus("Failed to load group data.");
      } finally {
        setLoading(false);
      }
    };

    fetchGroup();
  }, [groupId, userId, token]);

  // LIKE POST
  const handleLike = async (postId: string) => {
    try {
      const res = await fetch(`http://localhost:5000/groups/${groupId}/post/${postId}/like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      setPosts(posts.map(p =>
        p._id === postId
          ? {
            ...p,
            likes: data.likedByUser
              ? [...p.likes, userId]
              : p.likes.filter((id) => id !== userId),
          }
          : p
      ));
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (postId: string) => {
    if (!commentInputs[postId]?.trim()) return;

    try {
      const res = await fetch(
        `http://localhost:5000/groups/${groupId}/post/${postId}/comment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ text: commentInputs[postId] }),
        }
      );

      const comment = await res.json();
      if (!comment || !comment._id) return;

      const formattedComment: Comment = {
        _id: comment._id.toString(),
        text: comment.text,
        createdAt: comment.createdAt,
        user: {
          username: comment.user?.username || "Unknown",
          profilePhoto: comment.user?.profilePhoto,
        },
      };

      setPosts(posts.map((p) =>
        p._id === postId ? { ...p, comments: [...p.comments, formattedComment] } : p
      ));

      setCommentInputs({ ...commentInputs, [postId]: "" });
    } catch (err) {
      console.error(err);
    }
  };

  const handleCommentChange = (postId: string, value: string) => {
    setCommentInputs({ ...commentInputs, [postId]: value });
  };

  // Alternative handleCreatePost function - refetch instead of adding to array
  const handleCreatePost = async () => {
    if (!newPostContent.trim() && !newPostMedia) return;

    const formData = new FormData();
    formData.append("content", newPostContent);
    if (newPostMedia) formData.append("media", newPostMedia);

    try {
      const res = await fetch(`http://localhost:5000/groups/${groupId}/post`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to create post");

      // Clear form immediately
      setNewPostContent("");
      setNewPostMedia(null);
      setStatus("Post created successfully!");

      // Refetch posts instead of adding to array
      const postsRes = await fetch(`http://localhost:5000/groups/${groupId}/posts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const updatedPosts: GroupPost[] = await postsRes.json();

      // Sort posts by creation date - newest first
      const sortedPosts = updatedPosts.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setPosts(sortedPosts);
      setTimeout(() => setStatus(null), 3000);

    } catch (err) {
      console.error(err);
      setStatus("Failed to create post");
      setTimeout(() => setStatus(null), 3000);
    }
  };

  const handleJoinLeave = async () => {
    if (!group) return;
    try {
      let url = "";
      if (joined) url = `http://localhost:5000/groups/${group._id}/leave`;
      else if (!joined && !requested) url = `http://localhost:5000/groups/${group._id}/request`;
      else return;

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
      const res = await fetch(
        `http://localhost:5000/groups/${group._id}/accept/${requestUserId}`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` } }
      );
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
                <img
                  src={m.user.profilePhoto?.url || "/default-avatar.png"}
                  alt={m.user.username}
                  onError={(e) => {
                    console.log("Member avatar failed to load:", m.user.profilePhoto?.url);
                    e.currentTarget.src = "/default-avatar.png";
                  }}
                />
                <span>
                  {m.user.username} {m.role === "owner" && "(Owner)"}
                </span>
              </li>
            ))}
          </ul>

          {isOwner && group.joinRequests.length > 0 && (
            <>
              <h4>Join Requests</h4>
              <ul>
                {group.joinRequests.map((r) =>
                  r.user ? (
                    <li key={r.user._id}>
                      <img
                        src={r.user.profilePhoto?.url || "/default-avatar.png"}
                        alt={r.user.username}
                        onError={(e) => {
                          e.currentTarget.src = "/default-avatar.png";
                        }}
                      />
                      <span>{r.user.username}</span>
                      <button onClick={() => handleAcceptRequest(r.user._id)}>Accept</button>
                    </li>
                  ) : null
                )}
              </ul>
            </>
          )}
        </div>

        {/* CENTER */}
        <div className="center-group" ref={postsContainerRef}>
          <div className="group-header">
            {group.profileImage && <img src={group.profileImage.url} alt={group.name} />}
            <h2>{group.name}</h2>
            <p>{group.description}</p>
            <button onClick={handleJoinLeave}>
              {joined ? "Leave Group" : requested ? "Request Pending" : "Request to Join"}
            </button>
            {status && <p className="status-message">{status}</p>}
          </div>

          {joined && (
            <div className="create-post">
              <textarea
                placeholder="Write something..."
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
              ></textarea>
              <input type="file" onChange={(e) => setNewPostMedia(e.target.files?.[0] || null)} />
              <button onClick={handleCreatePost}>Post</button>
            </div>
          )}

          <div className="group-posts">
            <h3>Recent Posts</h3>
            {posts.length === 0 && <p>No posts yet.</p>}
            {posts.map((post, index) => (
              <div
                key={post._id}
                className={`group-post ${index === 0 && posts.length > lastPostCount ? 'new-post' : ''}`}
              >
                <div className="post-author">
                  <img
                    src={post.author.profilePhoto?.url || "/default-avatar.png"}
                    alt={post.author.username}
                    onError={(e) => {
                      console.log("Post author avatar failed to load:", post.author.profilePhoto?.url);
                      e.currentTarget.src = "/default-avatar.png";
                    }}
                  />
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
                <div className="post-stats">
                  {post.likes.length > 0 && (
                    <span className="like-count">❤️ {post.likes.length}</span>
                  )}
                  {post.comments.length > 0 && (
                    <span className="comment-count">{post.comments.length} comment{post.comments.length !== 1 ? 's' : ''}</span>
                  )}
                </div>
                <div className="post-actions">
                  <button onClick={() => handleLike(post._id)}>
                    {post.likes.includes(userId) ? "❤️" : "🤍"} {post.likes.length}
                  </button>
                </div>
                <div className="post-comments">
                  {post.comments.map((comment) => (
                    <div key={comment._id} className="comment">
                      <img
                        src={comment.user.profilePhoto?.url || "/default-avatar.png"}
                        alt={comment.user.username}
                        className="comment-avatar"
                        onError={(e) => {
                          console.log("Comment avatar failed to load:", comment.user.profilePhoto?.url);
                          e.currentTarget.src = "/default-avatar.png";
                        }}
                      />
                      <div className="comment-content">
                        <div className="comment-author">{comment.user.username}</div>
                        <div className="comment-text">{comment.text}</div>
                        <div className="comment-date">
                          {new Date(comment.createdAt).toLocaleDateString()} at {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}
                  {joined && (
                    <div className="add-comment">
                      <img
                        src="/default-avatar.png"
                        alt="Your avatar"
                        className="comment-avatar"
                        onError={(e) => {
                          e.currentTarget.src = "/default-avatar.png";
                        }}
                      />
                      <div className="comment-input-container">
                        <input
                          type="text"
                          placeholder="Write a comment..."
                          value={commentInputs[post._id] || ""}
                          onChange={(e) => handleCommentChange(post._id, e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleAddComment(post._id);
                            }
                          }}
                        />
                        <button
                          onClick={() => handleAddComment(post._id)}
                          disabled={!commentInputs[post._id]?.trim()}
                        >
                          Post
                        </button>
                      </div>
                    </div>
                  )}
                </div>
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