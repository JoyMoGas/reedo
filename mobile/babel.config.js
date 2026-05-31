module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      [
        "react-native-iconify/babel",
        {
          icons: [
            // ==========================================
            // FILLED ICONS
            // ==========================================
            "basil:eye-closed-solid",
            "boxicons:medal-star-alt",
            "boxicons:medal-star-filled",
            "boxicons:moon-filled",
            "flowbite:fire-solid",
            "ic:baseline-minus",
            "ic:baseline-plus",
            "material-symbols:block",
            "material-symbols:bolt-rounded",
            "material-symbols:flag",
            "material-symbols:home",
            "material-symbols:pause",
            "material-symbols:star",
            "mdi:compass",
            "mdi:stars",
            "mdi:users",
            "mingcute:user-add-fill",
            "mynaui:add-queue-solid",
            "ph:chat",
            "ph:chats",
            "ph:seal-check-bold",
            "ri:amazon-fill",
            "sidekickicons:quotation-mark-16-solid",
            "solar:sun-bold",

            // ==========================================
            // OUTLINED & LINE ICONS
            // ==========================================
            "ant-design:reload-time-outline",
            "arcticons:mercado-libre",
            "bi:pen",
            "fluent-mdl2:text-document-edit",
            "formkit:arrowleft",
            "formkit:arrowright",
            "gg:sand-clock",
            "gridicons:add",
            "gridicons:add-outline",
            "gridicons:external",
            "hugeicons:quill-write-02",
            "ic:outline-people",
            "iconoir:cancel",
            "ion:library",
            "lineicons:calendar-days",
            "lucide:file-edit",
            "lucide:notepad-text",
            "lucide:share",
            "material-symbols:bookmark-add",
            "material-symbols:bookmark-outline",
            "material-symbols:check-circle",
            "material-symbols:chevron-left-rounded",
            "material-symbols:chevron-right-rounded",
            "material-symbols:edit-note",
            "material-symbols:edit-outline",
            "material-symbols:home-outline",
            "material-symbols:hourglass-outline",
            "material-symbols:ink-pen-outline",
            "material-symbols:lock-open-outline-rounded",
            "material-symbols:search",
            "material-symbols:star-outline",
            "mdi:book-open-outline",
            "mdi:book-open-page-variant",
            "mdi:book-open-page-variant-outline",
            "mdi:book-search",
            "mdi:calendar-check-outline",
            "mdi:compass-outline",
            "mdi:eye-outline",
            "mdi:head-cog",
            "mdi:play-outline",
            "mdi:star-circle",
            "mdi:stars-outline",
            "mdi:users",
            "mingcute:notification-line",
            "pepicons-pencil:dots-y",
            "solar:infinity-outline",
            "solar:moon-line-duotone",
            "streamline-ultimate:office-shelf-1",
            "tabler:heart",
            "uil:snowflake",
          ],
        },
      ],
    ],
  };
};



