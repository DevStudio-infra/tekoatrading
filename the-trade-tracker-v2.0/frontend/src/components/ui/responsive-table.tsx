"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, ChevronUp, MoreVertical, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile, useIsTouchDevice, getTouchFriendlyClasses, getResponsiveTableClasses } from "@/lib/responsive-utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

export interface ResponsiveTableColumn<T> {
  key: keyof T;
  title: string;
  render?: (value: unknown, row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  mobileHidden?: boolean;
  mobileLabel?: string;
  width?: string;
  align?: "left" | "center" | "right";
  type?: "text" | "number" | "date" | "status" | "currency" | "percentage";
}

export interface ResponsiveTableAction<T> {
  label: string;
  icon?: React.ReactNode;
  onClick: (row: T, index: number) => void;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  disabled?: (row: T) => boolean;
  hidden?: (row: T) => boolean;
}

export interface ResponsiveTableProps<T extends Record<string, unknown>> {
  data: T[];
  columns: ResponsiveTableColumn<T>[];
  actions?: ResponsiveTableAction<T>[];
  loading?: boolean;
  searchable?: boolean;
  filterable?: boolean;
  sortable?: boolean;
  selectable?: boolean;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
  };
  onSort?: (key: string, direction: "asc" | "desc") => void;
  onRefresh?: () => void;
  emptyState?: {
    title: string;
    description: string;
    icon?: React.ReactNode;
    action?: {
      label: string;
      onClick: () => void;
    };
  };
  className?: string;
  mobileCardRender?: (row: T, index: number, columns: ResponsiveTableColumn<T>[]) => React.ReactNode;
}

export function ResponsiveTable<T extends Record<string, unknown>>({
  data,
  columns,
  actions,
  loading = false,
  searchable = true,
  filterable = false,
  sortable = true,
  selectable = false,
  pagination,
  onSort,
  onRefresh,
  emptyState,
  className,
  mobileCardRender,
}: ResponsiveTableProps<T>) {
  const isMobile = useIsMobile();
  const isTouchDevice = useIsTouchDevice();
  const tableClasses = getResponsiveTableClasses(isMobile);

  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  // Filter and sort data
  const processedData = useMemo(() => {
    let filtered = data;

    // Apply search filter
    if (searchTerm) {
      filtered = data.filter((row) =>
        columns.some((column) => {
          const value = row[column.key];
          return value?.toString().toLowerCase().includes(searchTerm.toLowerCase());
        })
      );
    }

    // Apply sorting
    if (sortConfig && !onSort) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[sortConfig.key] as string | number;
        const bValue = b[sortConfig.key] as string | number;

        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [data, searchTerm, sortConfig, columns, onSort]);

  const handleSort = (key: string) => {
    if (!sortable) return;

    const direction = sortConfig?.key === key && sortConfig.direction === "asc" ? "desc" : "asc";
    setSortConfig({ key, direction });
    onSort?.(key, direction);
  };

  const toggleRowExpansion = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  const toggleRowSelection = (index: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRows(newSelected);
  };

  const formatCellValue = (value: unknown, type?: string): string => {
    if (value === null || value === undefined) return "-";

    switch (type) {
      case "currency":
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(Number(value));
      case "percentage":
        return `${Number(value).toFixed(2)}%`;
      case "number":
        return new Intl.NumberFormat("en-US").format(Number(value));
      case "date":
        return new Date(value as string | number | Date).toLocaleDateString();
      default:
        return String(value);
    }
  };

  const visibleColumns = columns.filter((col) => !col.mobileHidden || !isMobile);
  const hiddenColumns = columns.filter((col) => col.mobileHidden && isMobile);

  // Loading state
  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        {/* Search skeleton */}
        {searchable && (
          <Card>
            <CardContent className="p-4">
              <Skeleton className="h-10 w-full max-w-md" />
            </CardContent>
          </Card>
        )}

        {/* Table skeleton */}
        <Card>
          <CardContent className="p-0">
            {isMobile ? (
              <div className="space-y-4 p-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2 p-4">
                <Skeleton className="h-10 w-full" />
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Empty state
  if (processedData.length === 0 && !loading) {
    return (
      <div className={cn("space-y-4", className)}>
        {/* Search and filters */}
        {(searchable || filterable) && (
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-2">
                {searchable && (
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
                  </div>
                )}
                {filterable && (
                  <Button variant="outline" size="sm" className={cn("gap-2", getTouchFriendlyClasses(isTouchDevice, "small"))}>
                    <Filter className="h-4 w-4" />
                    Filter
                  </Button>
                )}
                {onRefresh && (
                  <Button variant="outline" size="sm" onClick={onRefresh} className={cn("gap-2", getTouchFriendlyClasses(isTouchDevice, "small"))}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        <Card>
          <CardContent className="p-8 text-center">
            {emptyState?.icon && <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">{emptyState.icon}</div>}
            <h3 className="mb-2 text-lg font-semibold">{emptyState?.title || "No data available"}</h3>
            <p className="mb-4 text-muted-foreground">{emptyState?.description || "There are no items to display at the moment."}</p>
            {emptyState?.action && (
              <Button onClick={emptyState.action.onClick} className={getTouchFriendlyClasses(isTouchDevice, "medium")}>
                {emptyState.action.label}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Mobile card view
  if (isMobile) {
    return (
      <div className={cn(tableClasses.container, className)}>
        {/* Search and filters */}
        {(searchable || filterable) && (
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-2">
                {searchable && (
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
                  </div>
                )}
                {filterable && (
                  <Button variant="outline" size="sm" className={cn("gap-2", getTouchFriendlyClasses(isTouchDevice, "small"))}>
                    <Filter className="h-4 w-4" />
                    Filter
                  </Button>
                )}
                {onRefresh && (
                  <Button variant="outline" size="sm" onClick={onRefresh} className={cn("gap-2", getTouchFriendlyClasses(isTouchDevice, "small"))}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mobile cards */}
        <div className="space-y-3">
          {processedData.map((row, index) => (
            <Card key={index} className={cn("transition-all duration-200", selectedRows.has(index) && "ring-2 ring-primary", getTouchFriendlyClasses(isTouchDevice, "small"))}>
              <CardContent className="p-4">
                {mobileCardRender ? (
                  mobileCardRender(row, index, columns)
                ) : (
                  <div className={tableClasses.row}>
                    {/* Main visible data */}
                    {visibleColumns.map((column) => (
                      <div key={String(column.key)} className="flex justify-between items-center">
                        <span className={tableClasses.label}>{column.mobileLabel || column.title}</span>
                        <span className={cn(tableClasses.value, column.align === "right" && "text-right")}>
                          {column.render ? column.render(row[column.key], row, index) : formatCellValue(row[column.key], column.type)}
                        </span>
                      </div>
                    ))}

                    {/* Expandable hidden data */}
                    {hiddenColumns.length > 0 && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => toggleRowExpansion(index)} className="w-full justify-between">
                          <span>{expandedRows.has(index) ? "Show Less" : "Show More"}</span>
                          {expandedRows.has(index) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>

                        {expandedRows.has(index) && (
                          <div className="space-y-2 pt-2 border-t">
                            {hiddenColumns.map((column) => (
                              <div key={String(column.key)} className="flex justify-between items-center">
                                <span className={tableClasses.label}>{column.title}</span>
                                <span className={cn(tableClasses.value, column.align === "right" && "text-right")}>
                                  {column.render ? column.render(row[column.key], row, index) : formatCellValue(row[column.key], column.type)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}

                    {/* Actions */}
                    {actions && actions.length > 0 && (
                      <div className={tableClasses.actions}>
                        {actions
                          .filter((action) => !action.hidden?.(row))
                          .map((action, actionIndex) => (
                            <Button
                              key={actionIndex}
                              variant={action.variant || "outline"}
                              size={action.size || "sm"}
                              onClick={() => action.onClick(row, index)}
                              disabled={action.disabled?.(row)}
                              className={getTouchFriendlyClasses(isTouchDevice, "small")}>
                              {action.icon && <span className="mr-1">{action.icon}</span>}
                              {action.label}
                            </Button>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Mobile pagination */}
        {pagination && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => pagination.onPageChange(pagination.page - 1)}
                  className={getTouchFriendlyClasses(isTouchDevice, "small")}>
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {pagination.page} of {Math.ceil(pagination.total / pagination.pageSize)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= Math.ceil(pagination.total / pagination.pageSize)}
                  onClick={() => pagination.onPageChange(pagination.page + 1)}
                  className={getTouchFriendlyClasses(isTouchDevice, "small")}>
                  Next
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Desktop table view
  return (
    <div className={cn("space-y-4", className)}>
      {/* Search and filters */}
      {(searchable || filterable) && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              {searchable && (
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
                </div>
              )}

              <div className="flex gap-2">
                {filterable && (
                  <Button variant="outline" size="sm" className="gap-2">
                    <Filter className="h-4 w-4" />
                    Filter
                  </Button>
                )}
                {onRefresh && (
                  <Button variant="outline" size="sm" onClick={onRefresh} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Desktop table */}
      <Card>
        <CardContent className="p-0">
          <div className={tableClasses.container}>
            <table className={tableClasses.table}>
              <thead className={tableClasses.header}>
                <tr>
                  {selectable && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-12">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRows(new Set(processedData.map((_, i) => i)));
                          } else {
                            setSelectedRows(new Set());
                          }
                        }}
                        checked={selectedRows.size === processedData.length && processedData.length > 0}
                      />
                    </th>
                  )}

                  {visibleColumns.map((column) => (
                    <th
                      key={String(column.key)}
                      className={cn(
                        "px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider",
                        column.align === "center" && "text-center",
                        column.align === "right" && "text-right",
                        column.sortable !== false && sortable && "cursor-pointer hover:text-foreground",
                        column.width && `w-[${column.width}]`
                      )}
                      onClick={() => column.sortable !== false && handleSort(String(column.key))}>
                      <div className="flex items-center gap-1">
                        <span>{column.title}</span>
                        {column.sortable !== false && sortable && (
                          <div className="ml-1">
                            {sortConfig?.key === column.key ? (
                              sortConfig.direction === "asc" ? (
                                <ArrowUp className="h-3 w-3" />
                              ) : (
                                <ArrowDown className="h-3 w-3" />
                              )
                            ) : (
                              <ArrowUpDown className="h-3 w-3 opacity-50" />
                            )}
                          </div>
                        )}
                      </div>
                    </th>
                  ))}

                  {actions && actions.length > 0 && <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>}
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {processedData.map((row, index) => (
                  <tr key={index} className={cn(tableClasses.row, selectedRows.has(index) && "bg-muted/50")}>
                    {selectable && (
                      <td className="px-6 py-4">
                        <input type="checkbox" className="rounded border-gray-300" checked={selectedRows.has(index)} onChange={() => toggleRowSelection(index)} />
                      </td>
                    )}

                    {visibleColumns.map((column) => (
                      <td key={String(column.key)} className={cn(tableClasses.cell, column.align === "center" && "text-center", column.align === "right" && "text-right")}>
                        {column.render ? column.render(row[column.key], row, index) : formatCellValue(row[column.key], column.type)}
                      </td>
                    ))}

                    {actions && actions.length > 0 && (
                      <td className="px-6 py-4 text-right">
                        <div className={tableClasses.actions}>
                          {actions
                            .filter((action) => !action.hidden?.(row))
                            .slice(0, 2)
                            .map((action, actionIndex) => (
                              <Button
                                key={actionIndex}
                                variant={action.variant || "ghost"}
                                size={action.size || "sm"}
                                onClick={() => action.onClick(row, index)}
                                disabled={action.disabled?.(row)}>
                                {action.icon && <span className="mr-1">{action.icon}</span>}
                                {action.label}
                              </Button>
                            ))}

                          {actions.filter((action) => !action.hidden?.(row)).length > 2 && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {actions
                                  .filter((action) => !action.hidden?.(row))
                                  .slice(2)
                                  .map((action, actionIndex) => (
                                    <DropdownMenuItem key={actionIndex} onClick={() => action.onClick(row, index)} disabled={action.disabled?.(row)}>
                                      {action.icon && <span className="mr-2">{action.icon}</span>}
                                      {action.label}
                                    </DropdownMenuItem>
                                  ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Desktop pagination */}
      {pagination && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {(pagination.page - 1) * pagination.pageSize + 1} to {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} results
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => pagination.onPageChange(pagination.page - 1)}>
                  Previous
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, Math.ceil(pagination.total / pagination.pageSize)) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <Button key={page} variant={page === pagination.page ? "default" : "outline"} size="sm" onClick={() => pagination.onPageChange(page)}>
                        {page}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= Math.ceil(pagination.total / pagination.pageSize)}
                  onClick={() => pagination.onPageChange(pagination.page + 1)}>
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Example usage component
export function ExampleTable() {
  const columns: ResponsiveTableColumn<Record<string, unknown>>[] = [
    {
      key: "name",
      title: "Name",
      sortable: true,
    },
    {
      key: "email",
      title: "Email",
      sortable: true,
      mobileHidden: true,
    },
    {
      key: "status",
      title: "Status",
      render: (value: unknown) => (
        <Badge variant={value === "active" ? "default" : "secondary"}>
          {String(value)}
        </Badge>
      ),
    },
  ];

  const actions: ResponsiveTableAction<Record<string, unknown>>[] = [
    {
      label: "View",
      onClick: (row: Record<string, unknown>) => console.log("View", row),
    },
    {
      label: "Edit",
      onClick: (row: Record<string, unknown>) => console.log("Edit", row),
    },
    {
      label: "Delete",
      variant: "destructive",
      onClick: (row: Record<string, unknown>) => console.log("Delete", row),
    },
  ];

  const data = [
    { name: "John Doe", email: "john@example.com", status: "active" },
    { name: "Jane Smith", email: "jane@example.com", status: "inactive" },
  ];

  return (
    <ResponsiveTable
      data={data}
      columns={columns}
      actions={actions}
      searchable
      filterable
      pagination={{
        page: 1,
        pageSize: 10,
        total: 2,
        onPageChange: () => {},
        onPageSizeChange: () => {},
      }}
    />
  );
}
