import React, { useState, useEffect, useRef } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Product, ProductImage } from "@/types/products";
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, useUploadProductImages, PRODUCT_QUERY_KEYS } from "@/hooks/useProducts";
import { useQueryClient } from "@tanstack/react-query";
import { adminProductService } from "@/services/productService";
import { useRequireAuth } from "@/hooks/useAuth";
import { turtleAlbumService } from "@/services/turtleAlbumService";
import { createImageUrl } from "@/lib/api";
import type { Series } from "@/types/turtleAlbum";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationInfo,
  PaginationItem,
  PaginationLast,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Upload,
  Image as ImageIcon,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GripVertical
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

import { ProductsToolbar } from "./products/ProductsToolbar";
import { TurtleFilters } from "./products/TurtleFilters";
import { ProductsTableDesktop } from "./products/ProductsTableDesktop";
import { ProductsListMobile } from "./products/ProductsListMobile";

// Image upload interface
interface ProductImageUpload {
  file: File;
  preview: string;
  id: string;
  type?: 'main' | 'gallery' | 'dimensions' | 'detail';
}

// Form validation schema
const formSchema = z.object({
  name: z.string().min(1, "产品名称不能为空"),
  code: z.string().min(1, "货号不能为空"),
  description: z.string().min(1, "产品描述不能为空"),
  hasSample: z.boolean().default(false),
  inStock: z.boolean().default(true),
  popularityScore: z.coerce.number().min(0).max(100).default(0),
  isFeatured: z.boolean().default(false),
  stage: z.string().default("unknown"),
  status: z.enum(["draft", "active", "reserved", "sold"]).default("draft")
});

const AdminProducts = () => {
  // Protect admin route
  const { isAuthenticated, isLoading: authLoading } = useRequireAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<keyof Product | "">("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [listFilters, setListFilters] = useState<{ sex?: string; series_id?: string }>({});
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductDetailOpen, setIsProductDetailOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Series state
  const [seriesList, setSeriesList] = useState<Series[]>([]);

  // New state for multiple images
  const [imageUploads, setImageUploads] = useState<ProductImageUpload[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [hasImageOrderChanged, setHasImageOrderChanged] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // API hooks
  const { data: apiProductsData, isLoading: productsLoading, error: productsError } = useProducts({
    enabled: isAuthenticated,
    page: currentPage,
    limit: itemsPerPage,
    search: searchQuery.trim() || undefined,
    filters: listFilters,
  });
  const createProductMutation = useCreateProduct();
  const updateProductMutation = useUpdateProduct();
  const deleteProductMutation = useDeleteProduct();
  const uploadImagesMutation = useUploadProductImages();

  // Use API data
  const products = apiProductsData?.products || [];
  const totalProducts = apiProductsData?.total || 0;
  const totalPages = apiProductsData?.totalPages || 1;
  const getPrimaryImageUrl = (product: Product): string | null => {
    if (!product.images || product.images.length === 0) return null;
    const mainImage = product.images.find((img) => img.type === "main") || product.images[0];
    return mainImage?.url ? createImageUrl(mainImage.url) : null;
  };

  // Local state for filtered products
  const [filteredProducts, setFilteredProducts] = useState<Product[]>(products);

  // Fetch series list
  useEffect(() => {
    const fetchSeries = async () => {
      try {
        const series = await turtleAlbumService.listSeries();
        setSeriesList(series);
      } catch (error) {
        console.error('Failed to fetch series:', error);
      }
    };
    if (isAuthenticated) {
      fetchSeries();
    }
  }, [isAuthenticated]);

  // Update filtered products when products data changes
  useEffect(() => {
    setFilteredProducts(products);
  }, [products]);

  // Show error toast if API call fails
  useEffect(() => {
    if (productsError) {
      toast({
        title: "加载失败",
        description: "获取产品列表时发生错误",
        variant: "destructive",
      });
    }
  }, [productsError, toast]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    itemsPerPage,
  ]);

  // Generate page numbers for display (with ellipsis for long lists)
  const getPageNumbers = () => {
    const pageNumbers: Array<number | "ellipsis"> = [];

    pageNumbers.push(1);

    if (currentPage > 3) {
      pageNumbers.push("ellipsis");
    }

    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      if (i !== 1 && i !== totalPages) {
        pageNumbers.push(i);
      }
    }

    if (currentPage < totalPages - 2) {
      pageNumbers.push("ellipsis");
    }

    if (totalPages > 1) {
      pageNumbers.push(totalPages);
    }
    return pageNumbers;
  };

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  // Handle sort
  const handleSort = (field: keyof Product) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }

    // Sort products
    const sorted = [...filteredProducts].sort((a, b) => {
      
      const aValue = a[field];
      const bValue = b[field];
      
      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }
      
      return 0;
    });
    
    setFilteredProducts(sorted);
  };

  // Handle image upload
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const files = Array.from(e.target.files);

    // Reset the input so the same file can be selected again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    // Edit mode: upload immediately to backend so the public pages can use it.
    if (selectedProduct && isEditMode) {
      try {
        const result = await uploadImagesMutation.mutateAsync({
          productId: selectedProduct.id,
          files,
        });

        // Refresh local state from backend result
        setSelectedProduct(prev => (prev ? { ...prev, images: result.images } : prev));
        setFilteredProducts(prev => prev.map(p => (p.id === selectedProduct.id ? { ...p, images: result.images } : p)));
        queryClient.setQueryData(
          PRODUCT_QUERY_KEYS.detail(selectedProduct.id),
          (oldData: Product | undefined) => (oldData ? { ...oldData, images: result.images } : oldData)
        );

        initImagesFromProduct({ ...selectedProduct, images: result.images });

        toast({
          title: "图片已上传",
          description: `已上传 ${files.length} 张图片（系统会自动裁成 1:1）`,
        });
      } catch (error) {
        console.error('Failed to upload images:', error);
        toast({
          title: "上传失败",
          description: (error as Error).message || "图片上传失败，请重试",
          variant: "destructive",
        });
      }
      return;
    }

    // Create mode: store previews; upload happens after product is created.
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const newUpload: ProductImageUpload = {
          file,
          preview: reader.result as string,
          id: Math.random().toString(36).substring(2, 9),
        };
        setImageUploads(prev => [...prev, newUpload]);
      };
      reader.readAsDataURL(file);
    });

    toast({
      title: "图片已选择",
      description: `已选择 ${files.length} 张图片，创建产品后会自动上传（系统会自动裁成 1:1）`,
    });
  };

  // Navigate through images
  const handleNextImage = () => {
    if (currentImageIndex < imageUploads.length - 1) {
      setCurrentImageIndex(prev => prev + 1);
    }
  };

  const handlePrevImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(prev => prev - 1);
    }
  };

  // Remove specific image
  const handleRemoveImage = async (idToRemove: string) => {
    // Edit mode: delete from backend
    if (selectedProduct && isEditMode) {
      if (!confirm("确定要删除这张图片吗？")) return;

      try {
        await adminProductService.deleteProductImage(selectedProduct.id, idToRemove);

        const nextImages = (selectedProduct.images || []).filter(img => img.id !== idToRemove);
        const nextProduct = { ...selectedProduct, images: nextImages };

        setSelectedProduct(nextProduct);
        setFilteredProducts(prev => prev.map(p => (p.id === selectedProduct.id ? { ...p, images: nextImages } : p)));
        queryClient.setQueryData(
          PRODUCT_QUERY_KEYS.detail(selectedProduct.id),
          (oldData: Product | undefined) => (oldData ? { ...oldData, images: nextImages } : oldData)
        );

        initImagesFromProduct(nextProduct);

        toast({
          title: "已删除",
          description: "图片已删除",
        });
      } catch (error) {
        console.error('Failed to delete image:', error);
        toast({
          title: "删除失败",
          description: (error as Error).message || "图片删除失败，请重试",
          variant: "destructive",
        });
      }
      return;
    }

    // Create mode: remove locally
    setImageUploads(prev => {
      const newUploads = prev.filter(upload => upload.id !== idToRemove);

      if (currentImageIndex >= newUploads.length && newUploads.length > 0) {
        setCurrentImageIndex(newUploads.length - 1);
      }

      return newUploads;
    });
  };

  // Move image up in order - 使用拖拽替代
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', index.toString());

    // 添加拖拽样式
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  // 拖拽结束
  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedIndex(null);
    setDragOverIndex(null);

    // 恢复样式
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
  };

  // 拖拽悬停
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  // 拖拽离开
  const handleDragLeave = (e: React.DragEvent) => {
    // 只在真正离开元素时清除 hover 效果
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverIndex(null);
    }
  };

  // 放置
  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDragOverIndex(null);
      return;
    }

    // 重新排序图片
    const newUploads = [...imageUploads];
    const draggedItem = newUploads[draggedIndex];

    // 移除拖拽的项目
    newUploads.splice(draggedIndex, 1);
    // 在新位置插入
    newUploads.splice(dropIndex, 0, draggedItem);

    setImageUploads(newUploads);

    // 如果拖拽的是当前选中的图片，更新选中索引
    if (draggedIndex === currentImageIndex) {
      setCurrentImageIndex(dropIndex);
    } else if (draggedIndex < currentImageIndex && dropIndex >= currentImageIndex) {
      setCurrentImageIndex(currentImageIndex - 1);
    } else if (draggedIndex > currentImageIndex && dropIndex <= currentImageIndex) {
      setCurrentImageIndex(currentImageIndex + 1);
    }

    setDragOverIndex(null);
    setDraggedIndex(null);
    setHasImageOrderChanged(true);

    toast({
      title: "图片顺序已更新",
      description: "您可以继续拖拽调整图片顺序",
    });
  };

  // Move image up in order - 保留原有按钮功能作为备用
  const handleMoveImageUp = (index: number) => {
    if (index > 0) {
      setImageUploads(prev => {
        const newUploads = [...prev];
        [newUploads[index - 1], newUploads[index]] = [newUploads[index], newUploads[index - 1]];

        // Update current index if needed
        if (currentImageIndex === index) {
          setCurrentImageIndex(index - 1);
        } else if (currentImageIndex === index - 1) {
          setCurrentImageIndex(index);
        }

        return newUploads;
      });
      setHasImageOrderChanged(true);
    }
  };

  // Move image down in order - 保留原有按钮功能作为备用
  const handleMoveImageDown = (index: number) => {
    setImageUploads(prev => {
      if (index < prev.length - 1) {
        const newUploads = [...prev];
        [newUploads[index], newUploads[index + 1]] = [newUploads[index + 1], newUploads[index]];

        // Update current index if needed
        if (currentImageIndex === index) {
          setCurrentImageIndex(index + 1);
        } else if (currentImageIndex === index + 1) {
          setCurrentImageIndex(index);
        }

        return newUploads;
      }
      return prev;
    });
    setHasImageOrderChanged(true);
  };

  // Save image order to backend
  const saveImageOrder = async (productId: string) => {
    if (!imageUploads.length) return;

    try {
      const imageOrders = imageUploads.map((upload, index) => ({
        id: upload.id,
        sort_order: index
      }));

      const result = await adminProductService.reorderProductImages(productId, imageOrders);

      setSelectedProduct(prev =>
        prev && prev.id === productId ? { ...prev, images: result.images } : prev
      );
      setFilteredProducts(prev =>
        prev.map(product =>
          product.id === productId ? { ...product, images: result.images } : product
        )
      );
      queryClient.setQueryData(
        PRODUCT_QUERY_KEYS.detail(productId),
        (oldData: Product | undefined) =>
          oldData ? { ...oldData, images: result.images } : oldData
      );
      queryClient.setQueriesData(
        { queryKey: PRODUCT_QUERY_KEYS.lists() },
        (oldData: { products?: Product[] } | undefined) => {
          if (!oldData?.products) return oldData;
          return {
            ...oldData,
            products: oldData.products.map(product =>
              product.id === productId ? { ...product, images: result.images } : product
            ),
          };
        }
      );

      toast({
        title: "图片排序已保存",
        description: "图片显示顺序已更新",
      });
    } catch (error) {
      console.error('Failed to save image order:', error);
      toast({
        title: "保存失败",
        description: "图片排序保存失败，请重试",
        variant: "destructive",
      });
    }
  };

  // Trigger file input click
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Reset image state
  const resetImages = () => {
    setImageUploads([]);
    setCurrentImageIndex(0);
  };

  // Initialize images from product
  const initImagesFromProduct = (product: Product) => {
    if (product.images && product.images.length > 0) {
      const initialUploads: ProductImageUpload[] = product.images.map(img => ({
        id: img.id,
        preview: img.url,
        type: img.type,
        file: new File([], "existing-image", { type: "image/jpeg" }) // Placeholder file object
      }));
      setImageUploads(initialUploads);
      setCurrentImageIndex(0);
    } else {
      resetImages();
    }
  };

  // Handle view product details
  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsEditMode(false);
    setIsProductDetailOpen(true);
    
    // Initialize images
    initImagesFromProduct(product);
  };

  // Handle edit product
  const handleEditProduct = async (product: Product) => {
    setSelectedProduct(product);
    setIsEditMode(true);
    setIsProductDetailOpen(true);

    editForm.setValue('isFeatured', product.isFeatured);

    // Initialize images
    initImagesFromProduct(product);
  };

  // Handle delete product
  const handleDeleteProduct = (productId: string) => {
    if (confirm("确定要删除该产品吗？此操作不可逆。")) {
      deleteProductMutation.mutate(productId);
    }
  };

  // Init forms
  const editForm = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      hasSample: false,
      inStock: true,
      popularityScore: 0,
      stage: "unknown",
      status: "draft"
    }
  });

  const createForm = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      hasSample: false,
      inStock: true,
      popularityScore: 0,
      stage: "unknown",
      status: "draft"
    }
  });

  useEffect(() => {
    if (selectedProduct && isEditMode) {
      // Update form values when selected product changes
      editForm.reset({
        name: selectedProduct.name,
        code: selectedProduct.code,
        description: selectedProduct.description,
        hasSample: false,
        inStock: selectedProduct.inStock,
        popularityScore: selectedProduct.popularityScore,
        stage: selectedProduct.stage || "unknown",
        status: selectedProduct.status || "draft"
      });

      // Initialize images
      initImagesFromProduct(selectedProduct);
    }
  }, [selectedProduct, editForm, isEditMode]);

  // Convert ImageUpload[] to ProductImage[]
  const convertImagesToProductImages = (uploads: ProductImageUpload[], productName: string): ProductImage[] => {
    return uploads.map((upload, index) => ({
      id: upload.id,
      url: upload.preview,
      alt: `${productName} - Image ${index + 1}`,
      type: index === 0 ? 'main' : 'gallery',
      sort_order: index
    }));
  };

  const handleCreateProduct = async (values: z.infer<typeof formSchema>) => {
    try {
      // First create the product without images
      const backendProductData = {
        name: values.name,
        code: values.code,
        description: values.description || "",
        stage: values.stage,
        status: values.status,
        has_sample: values.hasSample,
        cost_price: 0, // Default value, can be updated later
        factory_price: 0, // Default value, can be updated later
        in_stock: values.inStock,
        popularity_score: values.popularityScore,
        images: [] // Create product without images first
      };

      createProductMutation.mutate(backendProductData, {
        onSuccess: async (response) => {
          let created = response as Product;

          // Upload images if any
          if (imageUploads.length > 0 && response?.id) {
            const filesToUpload = imageUploads.filter(upload => upload.file.size > 0); // Filter out placeholder files
            if (filesToUpload.length > 0) {
              try {
                const uploaded = await uploadImagesMutation.mutateAsync({
                  productId: response.id,
                  files: filesToUpload.map(upload => upload.file)
                });
                created = { ...response, images: uploaded.images };
              } catch (error) {
                console.error('Failed to upload images:', error);
              }
            }
          }

          // After creation, jump into edit/detail view so images can be managed (set main/delete/reorder).
          setIsCreateDialogOpen(false);
          createForm.reset();

          if (created?.id) {
            setSelectedProduct(created);
            setIsEditMode(true);
            setIsProductDetailOpen(true);
            initImagesFromProduct(created);
          }
        }
      });
    } catch (error) {
      console.error('Failed to create product:', error);
    }
  };

  const handleSaveProduct = (values: z.infer<typeof formSchema>) => {
    if (!selectedProduct) return;

    const updatedProductData = {
      name: values.name,
      code: values.code,
      description: values.description || "",
      stage: values.stage,
      status: values.status,
      has_sample: values.hasSample,
      in_stock: values.inStock,
      popularity_score: values.popularityScore,
      is_featured: values.isFeatured
    };

    updateProductMutation.mutate(
      { id: selectedProduct.id, productData: updatedProductData },
      {
        onSuccess: async () => {
          // Save image order if there are images
          if (imageUploads.length > 0) {
            try {
              await saveImageOrder(selectedProduct.id);
            } catch (error) {
              console.error('Failed to save image order:', error);
            }
          }

          setIsProductDetailOpen(false);
          resetImages();
        }
      }
    );
  };

  const toggleFunctionalDesign = (design: any) => {
    // This function is no longer needed but keeping stub for now
  };

  // Prepare image gallery and upload section
  const renderImageGallery = () => {
    return (
      <div className="mb-6">
        <p className="text-sm font-medium text-gray-900 mb-2">产品图片</p>
        
        {/* Image Carousel */}
        {imageUploads.length > 0 ? (
          <div className="mb-4">
            <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
              <img 
                src={imageUploads[currentImageIndex]?.preview} 
                alt="Product preview"
                className="h-full w-full object-cover"
              />
              
              <div className="absolute right-2 top-2 z-10 flex gap-2">
                {selectedProduct && isEditMode ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/90 rounded-full px-3 border-none h-8"
                    onClick={async () => {
                      const img = imageUploads[currentImageIndex];
                      if (!img?.id) return;
                      try {
                        const result = await adminProductService.setMainProductImage(selectedProduct.id, img.id);
                        const nextProduct = { ...selectedProduct, images: result.images };
                        setSelectedProduct(nextProduct);
                        setFilteredProducts(prev => prev.map(p => (p.id === selectedProduct.id ? { ...p, images: result.images } : p)));
                        queryClient.setQueryData(
                          PRODUCT_QUERY_KEYS.detail(selectedProduct.id),
                          (oldData: Product | undefined) => (oldData ? { ...oldData, images: result.images } : oldData)
                        );
                        initImagesFromProduct(nextProduct);
                        toast({ title: "主图已更新" });
                      } catch (e) {
                        toast({ title: "设置失败", description: (e as Error).message, variant: "destructive" });
                      }
                    }}
                  >
                    设为主图
                  </Button>
                ) : null}

                <Button
                  variant="outline" 
                  size="sm"
                  className="bg-white rounded-full p-1 border-none h-8 w-8"
                  onClick={() => handleRemoveImage(imageUploads[currentImageIndex].id)}
                >
                  <X className="h-4 w-4"/>
                </Button>
              </div>
              
              {imageUploads.length > 1 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`absolute left-2 top-1/2 -translate-y-1/2 bg-white bg-opacity-70 rounded-full p-1 border-none h-8 w-8 ${currentImageIndex === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={handlePrevImage}
                    disabled={currentImageIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`absolute right-2 top-1/2 -translate-y-1/2 bg-white bg-opacity-70 rounded-full p-1 border-none h-8 w-8 ${currentImageIndex === imageUploads.length - 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={handleNextImage}
                    disabled={currentImageIndex === imageUploads.length - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
            
            {/* Thumbnails */}
            {imageUploads.length > 1 && (
              <div className="mt-2">
                <div className="text-xs text-gray-700 mb-2 flex items-center gap-1">
                  <GripVertical className="h-3 w-3" />
                  拖拽图片可调整顺序
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {imageUploads.map((upload, index) => (
                    <div
                      key={upload.id}
                      className={`relative w-16 h-16 flex-shrink-0 rounded-md overflow-hidden border-2 cursor-move transition-all duration-200 ${
                        index === currentImageIndex ? 'border-gray-900' : 'border-transparent'
                      } ${
                        draggedIndex === index ? 'opacity-50 scale-95' : ''
                      } ${
                        dragOverIndex === index ? 'border-gray-900 border-dashed bg-gray-100' : ''
                      }`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index)}
                      onClick={() => setCurrentImageIndex(index)}
                      title="拖拽可调整图片顺序"
                    >
                      <img
                        src={upload.preview}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover pointer-events-none"
                      />

                      {/* 拖拽指示器 */}
                      <div className="absolute top-0 right-0 bg-black/20 rounded-bl p-1">
                        <GripVertical className="h-2 w-2 text-white" />
                      </div>

                      {/* 拖拽时的overlay提示 */}
                      {dragOverIndex === index && draggedIndex !== index && (
                        <div className="absolute inset-0 bg-gray-200/50 flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-900 bg-white px-1 py-0.5 rounded">
                            放置
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
        
        {/* Upload Button */}
        <div 
          className="border-2 border-dashed border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={triggerFileInput}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*"
            onChange={handleImageChange}
            multiple
          />
          <div className="flex flex-col items-center justify-center space-y-2">
            <Upload className="h-10 w-10 text-gray-300" />
            <p className="text-sm text-gray-600">点击上传产品图片</p>
            <p className="text-xs text-gray-500">支持 JPG/PNG/HEIC。上传后系统会自动居中裁切成 1:1。</p>
          </div>
        </div>
      </div>
    );
  };

  // Render Product Details
  const renderProductDetails = () => {
    if (!selectedProduct) return null;
    
    return (
      <div className="mt-6 space-y-6">
        <div>
          {/* Product Image Gallery for Details View */}
          {imageUploads.length > 0 ? (
            <div className="mb-4">
              <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                <img 
                  src={imageUploads[currentImageIndex]?.preview} 
                  alt={selectedProduct.name}
                  className="h-full w-full object-cover"
                />
                
                {imageUploads.length > 1 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className={`absolute left-2 top-1/2 -translate-y-1/2 bg-white bg-opacity-70 rounded-full p-1 border-none h-8 w-8 ${currentImageIndex === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={handlePrevImage}
                      disabled={currentImageIndex === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className={`absolute right-2 top-1/2 -translate-y-1/2 bg-white bg-opacity-70 rounded-full p-1 border-none h-8 w-8 ${currentImageIndex === imageUploads.length - 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={handleNextImage}
                      disabled={currentImageIndex === imageUploads.length - 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
              
              {/* Thumbnails */}
              {imageUploads.length > 1 && (
                <div className="mt-2">
                  {isEditMode && (
                    <div className="text-xs text-gray-700 mb-2 flex items-center gap-1">
                      <GripVertical className="h-3 w-3" />
                      拖拽图片可调整顺序
                    </div>
                  )}
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {imageUploads.map((upload, index) => (
                      <div
                        key={upload.id}
                        className={`relative w-16 h-16 flex-shrink-0 rounded-md overflow-hidden border-2 transition-all duration-200 ${
                          index === currentImageIndex ? 'border-gray-900' : 'border-transparent'
                        } ${
                          isEditMode ? 'cursor-move' : 'cursor-pointer'
                        } ${
                          draggedIndex === index ? 'opacity-50 scale-95' : ''
                        } ${
                          dragOverIndex === index ? 'border-gray-900 border-dashed bg-gray-100' : ''
                        }`}
                        draggable={isEditMode}
                        onDragStart={isEditMode ? (e) => handleDragStart(e, index) : undefined}
                        onDragEnd={isEditMode ? handleDragEnd : undefined}
                        onDragOver={isEditMode ? (e) => handleDragOver(e, index) : undefined}
                        onDragLeave={isEditMode ? handleDragLeave : undefined}
                        onDrop={isEditMode ? (e) => handleDrop(e, index) : undefined}
                        onClick={() => setCurrentImageIndex(index)}
                        title={isEditMode ? "拖拽可调整图片顺序" : "点击查看图片"}
                      >
                        <img
                          src={upload.preview}
                          alt={`Thumbnail ${index + 1}`}
                          className="w-full h-full object-cover pointer-events-none"
                        />

                        {/* 拖拽指示器 - 仅编辑模式显示 */}
                        {isEditMode && (
                          <div className="absolute top-0 right-0 bg-black/20 rounded-bl p-1">
                            <GripVertical className="h-2 w-2 text-white" />
                          </div>
                        )}

                        {/* 拖拽时的overlay提示 */}
                        {dragOverIndex === index && draggedIndex !== index && (
                          <div className="absolute inset-0 bg-gray-200/50 flex items-center justify-center">
                            <span className="text-xs font-medium text-gray-900 bg-white px-1 py-0.5 rounded">
                              放置
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center mb-4">
              <div className="text-gray-300">
                <Eye className="h-12 w-12" />
              </div>
            </div>
          )}

          <h3 className="text-xl font-medium text-gray-900">
            {selectedProduct.name}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            货号: {selectedProduct.code}
          </p>
        </div>


        <div>
          <p className="text-sm font-medium text-gray-900 mb-1">产品描述</p>
          <p className="text-gray-600 text-sm">
            {selectedProduct.description}
          </p>
        </div>

        <div className="flex justify-end gap-4 mt-8">
          <Button 
            variant="outline" 
            className="border-gray-300 text-gray-600 hover:bg-gray-200 hover:text-gray-900"
            onClick={() => setIsProductDetailOpen(false)}
          >
            关闭
          </Button>
          <Button 
            className="bg-gray-900 hover:bg-gray-800 text-white"
            onClick={() => {
              setIsEditMode(true);
            }}
          >
            <Edit className="mr-2 h-4 w-4" />
            编辑产品
          </Button>
        </div>
      </div>
    );
  };

  // Show loading state while authenticating or loading products
  if (authLoading || productsLoading) {
    return (
      <AdminLayout title="产品管理">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">加载中...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="产品管理">
      {/* Sticky Search and Actions Bar */}
      <div className="sticky top-0 z-10 bg-neutral-50 pb-4 mb-2">
        <ProductsToolbar
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          onImportSuccess={() => queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.lists() })}
          onCreateClick={() => {
            resetImages();
            setSelectedFunctionalDesigns([]);
            setIsCreateDialogOpen(true);
          }}
        />

        <TurtleFilters
          filters={listFilters}
          seriesList={seriesList}
          onChange={(next) => {
            setListFilters(next);
            setCurrentPage(1);
          }}
          onClear={() => {
            setListFilters({});
            setCurrentPage(1);
          }}
        />
      </div>

      <ProductsTableDesktop
        products={filteredProducts}
        totalProducts={totalProducts}
        seriesList={seriesList}
        getPrimaryImageUrl={getPrimaryImageUrl}
        onView={handleViewProduct}
        onEdit={handleEditProduct}
        onDelete={handleDeleteProduct}
        onSort={handleSort}
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={setItemsPerPage}
        onPageChange={handlePageChange}
      />

      <ProductsListMobile
        products={filteredProducts}
        seriesList={seriesList}
        getPrimaryImageUrl={getPrimaryImageUrl}
        onView={handleViewProduct}
        onEdit={handleEditProduct}
        onDelete={handleDeleteProduct}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />

      {/* Product Detail/Edit Sheet */}
      <Sheet open={isProductDetailOpen} onOpenChange={setIsProductDetailOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{isEditMode ? "编辑产品" : "产品详情"}</SheetTitle>
            <SheetDescription>
              {isEditMode ? "编辑产品的详细信息" : "查看产品的详细信息"}
            </SheetDescription>
          </SheetHeader>

          {/* Product Details View */}
          {selectedProduct && !isEditMode && renderProductDetails()}

          {/* Edit Product Form */}
          {selectedProduct && isEditMode && (
            <div className="mt-6">
              <Form {...editForm}>
                <form onSubmit={editForm.handleSubmit(handleSaveProduct)}>
                  <div className="space-y-4 pb-24">
                    {/* Image Upload Section - Uses the new multi-image component */}
                    {renderImageGallery()}

                    <div className="space-y-6">
                      {/* 基本信息部分 */}
                      <div className="space-y-4 border-b pb-6">
                        <h3 className="text-lg font-medium text-gray-900">基本信息</h3>
                        <FormField
                          control={editForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>产品名称</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="输入产品名称" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={editForm.control}
                          name="code"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>货号</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="输入产品货号" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={editForm.control}
                          name="stage"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Stage</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="unknown" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={editForm.control}
                          name="status"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Status</FormLabel>
                              <Select value={field.value} onValueChange={field.onChange}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="选择状态" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="draft">draft</SelectItem>
                                  <SelectItem value="active">active</SelectItem>
                                  <SelectItem value="reserved">reserved</SelectItem>
                                  <SelectItem value="sold">sold</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={editForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>产品描述</FormLabel>
                              <FormControl>
                                <Textarea 
                                  {...field} 
                                  placeholder="输入产品描述"
                                  className="min-h-[100px]"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Featured Product Toggle */}
                        <FormField
                          control={editForm.control}
                          name="isFeatured"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">精选产品</FormLabel>
                                <div className="text-sm text-muted-foreground">
                                  将此产品标记为精选产品，在首页展示
                                </div>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* 详细参数部分 */}
                    </div>

                  </div>
                  <div className="sticky bottom-0 -mx-6 px-6 py-4 bg-white border-t flex justify-end gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-gray-300 text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                      onClick={() => {
                        setIsEditMode(false);
                        initImagesFromProduct(selectedProduct);
                      }}
                    >
                      取消
                    </Button>
                    <Button
                      type="submit"
                      className="bg-gray-900 hover:bg-gray-800 text-white"
                    >
                      保存产品
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Create Product Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>添加产品</DialogTitle>
            <DialogDescription>
              填写以下表单添加新产品
            </DialogDescription>
          </DialogHeader>
          
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(handleCreateProduct)}>
              <div className="space-y-4 mt-4">
                {/* Image Upload Section - Uses the new multi-image component */}
                {renderImageGallery()}

                <div className="space-y-6">
                  {/* 基本信息部分 */}
                  <div className="space-y-4 border-b pb-6">
                    <h3 className="text-lg font-medium text-gray-900">基本信息</h3>
                    <FormField
                      control={createForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>产品名称</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="输入产品名称" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createForm.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>货号</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="输入产品货号" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createForm.control}
                      name="stage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stage</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="unknown" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createForm.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="选择状态" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="draft">draft</SelectItem>
                              <SelectItem value="active">active</SelectItem>
                              <SelectItem value="reserved">reserved</SelectItem>
                              <SelectItem value="sold">sold</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>产品描述</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="输入产品描述"
                              className="min-h-[100px]"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Featured Product Toggle */}
                    <FormField
                      control={createForm.control}
                      name="isFeatured"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">精选产品</FormLabel>
                            <div className="text-sm text-muted-foreground">
                              将此产品标记为精选产品，在首页展示
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* 详细参数部分 */}
                </div>

                <div className="flex justify-end gap-4 mt-8">
                  <Button 
                    type="button"
                    variant="outline" 
                    className="border-gray-300 text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                    onClick={() => {
                      setIsCreateDialogOpen(false);
                      resetImages();
                    }}
                  >
                    取消
                  </Button>
                  <Button 
                    type="submit"
                    className="bg-gray-900 hover:bg-gray-800 text-white"
                  >
                    添加产品
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminProducts;
