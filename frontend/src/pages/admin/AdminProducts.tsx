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
import { sortProductsByField } from "./products/utils/sort";

import { ProductSheet } from "./products/ProductSheet";
import { ProductDetailView } from "./products/ProductDetailView";

import { ProductImagesManager } from "./products/images/ProductImagesManager";
import { useProductImages } from "./products/images/useProductImages";

// Form validation schema
const formSchema = z.object({
  name: z.string().min(1, "产品名称不能为空"),
  code: z.string().min(1, "货号不能为空"),
  description: z.string().min(1, "产品描述不能为空"),
  hasSample: z.boolean().default(false),
  inStock: z.boolean().default(true),
  popularityScore: z.coerce.number().min(0).max(100).default(0),
  isFeatured: z.boolean().default(false),
  stage: z.string().default("hatchling"),
  status: z.enum(["draft", "active", "reserved", "sold"]).default("active")
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
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Series state
  const [seriesList, setSeriesList] = useState<Series[]>([]);

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

  const syncProductImages = (productId: string, images: ProductImage[]) => {
    setSelectedProduct((prev) => (prev && prev.id === productId ? { ...prev, images } : prev));
    setFilteredProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, images } : p)));

    queryClient.setQueryData(
      PRODUCT_QUERY_KEYS.detail(productId),
      (oldData: Product | undefined) => (oldData ? { ...oldData, images } : oldData)
    );

    queryClient.setQueriesData(
      { queryKey: PRODUCT_QUERY_KEYS.lists() },
      (oldData: { products?: Product[] } | undefined) => {
        if (!oldData?.products) return oldData;
        return {
          ...oldData,
          products: oldData.products.map((p) => (p.id === productId ? { ...p, images } : p)),
        };
      }
    );
  };

  const images = useProductImages({
    toast,
    editApi: {
      uploadImages: async ({ productId, files }) =>
        uploadImagesMutation.mutateAsync({ productId, files }),
      deleteImage: async ({ productId, imageId }) =>
        adminProductService.deleteProductImage(productId, imageId),
      reorderImages: async ({ productId, orders }) =>
        adminProductService.reorderProductImages(productId, orders),
      setMainImage: async ({ productId, imageId }) =>
        adminProductService.setMainProductImage(productId, imageId),
      onImagesSynced: ({ productId, images }) => syncProductImages(productId, images),
    },
  });

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

  // Handle sort (compute next direction synchronously; don't rely on setState timing)
  const handleSort = (field: keyof Product) => {
    const nextDirection: "asc" | "desc" =
      sortField === field ? (sortDirection === "asc" ? "desc" : "asc") : "asc";

    setSortField(field);
    setSortDirection(nextDirection);

    setFilteredProducts(sortProductsByField([...filteredProducts], field, nextDirection));
  };

  // Image handling extracted to products/images/*

  // Handle view product details
  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsEditMode(false);
    setIsProductDetailOpen(true);

    images.initFromProduct(product);
  };

  // Handle edit product
  const handleEditProduct = async (product: Product) => {
    setSelectedProduct(product);
    setIsEditMode(true);
    setIsProductDetailOpen(true);

    editForm.setValue("isFeatured", product.isFeatured);
    images.initFromProduct(product);
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

      images.initFromProduct(selectedProduct);
    }
  }, [selectedProduct, editForm, isEditMode]);

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

          // Upload images (create mode stores previews; upload after product is created)
          if (response?.id) {
            const filesToUpload = images.getFilesForCreate();
            if (filesToUpload.length > 0) {
              try {
                const uploaded = await uploadImagesMutation.mutateAsync({
                  productId: response.id,
                  files: filesToUpload,
                });
                created = { ...response, images: uploaded.images };
              } catch (error) {
                console.error("Failed to upload images:", error);
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
            images.initFromProduct(created);
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
          if (images.imageUploads.length > 0 && images.flags.hasImageOrderChanged) {
            await images.saveOrder({ productId: selectedProduct.id });
          }

          setIsProductDetailOpen(false);
          images.reset();
        }
      }
    );
  };

  const toggleFunctionalDesign = (design: any) => {
    // This function is no longer needed but keeping stub for now
  };


  const productDetails =
    selectedProduct && !isEditMode ? (
      <ProductDetailView
        product={selectedProduct}
        imageUploads={images.imageUploads}
        currentImageIndex={images.currentImageIndex}
        onPrevImage={images.handlePrevImage}
        onNextImage={images.handleNextImage}
        onSelectImageIndex={images.setCurrentImageIndex}
        onClose={() => setIsProductDetailOpen(false)}
        onEdit={() => setIsEditMode(true)}
      />
    ) : null;

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
            images.reset();
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
      <ProductSheet
        open={isProductDetailOpen}
        onOpenChange={setIsProductDetailOpen}
        isEditMode={isEditMode}
        detail={productDetails}
        edit={
          selectedProduct && isEditMode ? (
            <div className="mt-6">
                          <Form {...editForm}>
                            <form onSubmit={editForm.handleSubmit(handleSaveProduct)}>
                              <div className="space-y-4 pb-24">
                                <ProductImagesManager mode="edit" productId={selectedProduct.id} images={images} />
            
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
                                    images.initFromProduct(selectedProduct);
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
          ) : null
        }
      />

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
                <ProductImagesManager mode="create" images={images} />

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
                      images.reset();
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
