import React, { useState } from "react";
import { Text, View, TouchableOpacity } from "react-native";
import mockData from "../../assets/data/mockData.json";
import Icon from "../../core/Icon";
import { Avatar } from "../Avatar";

export default function CommunityEchoes() {
  // Track liked posts
    const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  
    const toggleLike = (postId: string) => {
      setLikedPosts((prev) => ({
        ...prev,
        [postId]: !prev[postId],
      }));
    };
  
  return (
    <View className="w-full mt-10">
          <View className="flex-row justify-between items-center w-full mb-4">
            <Text
              className="text-xl font-bold text-[#76767E] tracking-widest"
              style={{ fontFamily: "PublicSans-Bold" }}
            >
              COMMUNITY ECHOES
            </Text>
            <TouchableOpacity className="border-b border-[#76767E] pb-0.5">
              <Text
                className="text-sm text-[#76767E]"
                style={{ fontFamily: "PublicSans-Bold" }}
              >
                View All
              </Text>
            </TouchableOpacity>
          </View>

          <View className="flex-col">
            {mockData.posts.map((post) => (
              <View 
                key={post.id}
                className="py-5 border-b border-[#EAE2D5] flex-col"
              >
                <View className="flex-row items-center gap-3">
                  <Avatar
                    uri={post.userAvatar}
                    fullName={post.userFullName}
                    username={post.username}
                    size={40}
                  />
                  <View className="flex-row items-baseline gap-1.5 flex-1 flex-wrap">
                    <Text
                      className="text-base text-[#212842]"
                      style={{ fontFamily: "PublicSans-Bold" }}
                    >
                      {post.userFullName}
                    </Text>
                    <Text
                      className="text-xs text-[#76767E]"
                      style={{ fontFamily: "PublicSans-Regular" }}
                    >
                      @{post.username}
                    </Text>
                    <Text className="text-xs text-[#76767E]">•</Text>
                    <Text
                      className="text-xs text-[#76767E]"
                      style={{ fontFamily: "PublicSans-Regular" }}
                    >
                      {post.createdAt}
                    </Text>
                  </View>
                </View>

                <Text
                  className="text-base text-[#212842] mt-3 leading-relaxed"
                  style={{ fontFamily: "PublicSans-Regular" }}
                >
                  {post.content}
                </Text>

                {/* Likes and Comments */}
                <View className="flex-row items-center gap-6 mt-4">
                  <TouchableOpacity
                    onPress={() => toggleLike(post.id)}
                    className="flex-row items-center gap-1.5"
                    activeOpacity={0.7}
                  >
                    <Icon
                      name={likedPosts[post.id] ? "heartFilled" : "heart"}
                      size={24}
                      color={likedPosts[post.id] ? "#E57A7A" : "#76767E"}
                    />
                    <Text
                      className="text-s"
                      style={{
                        fontFamily: "PublicSans-Bold",
                        color: likedPosts[post.id] ? "#E57A7A" : "#76767E",
                      }}
                    >
                      {post.likes + (likedPosts[post.id] ? 1 : 0)}
                    </Text>
                  </TouchableOpacity>
                  <View className="flex-row items-center gap-1.5">
                    <Icon name="comment" size={24} color="#76767E" />
                    <Text
                      className="text-s text-[#76767E]"
                      style={{ fontFamily: "PublicSans-Bold" }}
                    >
                      {post.commentsCount}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
  )
}
