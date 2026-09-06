<template>
  <!-- 纯逻辑组件：显式空根节点，避免 SSR 无输出与客户端注释节点导致的水合错位 -->
  <span hidden aria-hidden="true" />
</template>