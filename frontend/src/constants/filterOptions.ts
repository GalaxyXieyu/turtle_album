// 后备筛选器选项 - 实际筛选器选项应从API获取
// Fallback filter options - actual filter options should be fetched from API
export const filterOptions = {
  developmentLineMaterials: ["注塑/吹瓶", "工艺注塑", "吹瓶"],
  capacityRange: {
    min: 1,
    max: 30
  },
  compartmentRange: {
    min: 1,
    max: 20
  }
};

// 注意：前端应该优先使用从 productService.getFilterOptions() 获取的动态数据
// Note: Frontend should prioritize dynamic data from productService.getFilterOptions()
