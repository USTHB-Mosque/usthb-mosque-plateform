"use client";
import React from "react";
import Layout from "@/components/layouts";
import { Pagination } from "@/components/common/Pagination";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ListingContent from "@/components/listing/ListingContent";
import ListingToolbar from "@/components/listing/listing-toolbar/ListingToolbar";
import ListingRenderer from "@/components/listing/ListingRenderer";
import { useGetBooksQuery } from "@/lib/apis/books";
import { useSearch } from "@/hooks/use-search";
import {
  BookSearchParams,
  BookCategory,
  BookType,
} from "@/interfaces/books.interfaces";
import { languagesConfigArray } from "@/utils/constants/data";
import BookCard from "@/components/ui/landing/BookCard";
import BookCardSkeleton from "@/components/ui/landing/BookCardSkeleton";
import EmptyData from "@/components/common/EmptyData";
import ErrorData from "@/components/common/ErrorData";
import {
  bookQuickTypesConfigArray,
  bookAuthorsConfigArray,
  bookTypesConfigArray,
} from "@/utils/constants/books";
import { Languages, Tag, User } from "lucide-react";

const LibraryPage: React.FC = () => {
  const { searchValues, values, setValue } = useSearch<BookSearchParams>({
    initialValues: {
      page: 1,
      limit: 12,
      search: "",
      availability: undefined,
      languages: [],
      types: [],
      category: BookCategory.Religious,
    },
    scope: "library",
  });

  const activeTab = values.category;

  const {
    data: { docs: books = [], totalPages = 1, totalDocs = 0 } = {},
    isLoading,
    isError,
  } = useGetBooksQuery(searchValues);

  return (
    <Layout>
      <div className="flex flex-col space-y-8 sm:space-y-12 lg:space-y-14">
        <div className="flex flex-col items-center justify-center gap-8 sm:gap-10 lg:gap-12 px-4">
          <div className="space-y-3 sm:space-y-4 text-center">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-secondary-500 mb-4 md:mb-6 text-center font-khalid">
              مكتبة المسجد
            </h1>
            <p className="text-lg md:text-xl text-center max-w-2xl text-muted-foreground">
              استكشف الكنوز المعرفية والكتب النادرة في مكتبة المسجد, متاحة
              للمطالعة والإستعارة.
            </p>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(v) => {
              const val = v as BookCategory;
              setValue("types", []);
              setValue("category", val);
            }}
          >
            <TabsList>
              <TabsTrigger value={BookCategory.Religious}>
                الكتب الدينية
              </TabsTrigger>
              <TabsTrigger value={BookCategory.Scientific}>
                الكتب العلمية
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <ListingContent>
          <ListingToolbar
            onApplyFilters={() => setValue("page", 1)}
            quickFilterSections={[
              {
                id: "types-quick",
                multiple: true,
                options: bookQuickTypesConfigArray[activeTab],
                value: values.types || [],
                onChange: (v) => setValue("types", v as BookType[]),
              },
            ]}
            searchProps={{
              enabled: true,
              value: searchValues.search || "",
              onChange: (value) => setValue("search", value),
              placeholder: "اسم الكتاب، المؤلف ...",
            }}
            filterSections={[
              {
                id: "types",
                title: "التصنيفات",
                icon: <Tag />,
                multiple: true,
                options: bookTypesConfigArray,
                value: values.types || [],
                onChange: (v) => setValue("types", v as BookType[]),
                resetValue: [],
              },
              {
                id: "authors",
                title: "المؤلفون",
                icon: <User />,
                multiple: true,
                options: bookAuthorsConfigArray,
                value: values.authors || [],
                onChange: (v) => setValue("authors", v as string[]),
                buttonClassName: "flex-1",
                resetValue: [],
              },
              {
                id: "languages",
                title: "اللغة",
                icon: <Languages />,
                multiple: true,
                options: languagesConfigArray,
                value: values.languages || [],
                onChange: (v) => setValue("languages", v as string[]),
                buttonClassName: "flex-1",
                resetValue: [],
              },
            ]}
          />

          <ListingRenderer
            isEmpty={totalDocs === 0}
            isError={isError}
            isLoading={isLoading}
            emptyFallback={<EmptyData title="لم يتم العثور على أي كتب" />}
            errorFallback={<ErrorData />}
            loader={
              <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 12 }).map((_, index) => (
                  <BookCardSkeleton key={index} />
                ))}
              </div>
            }
          >
            <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {books.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
            <Pagination
              totalPages={totalPages}
              onPageChange={(value) => setValue("page", value)}
              page={values.page || 1}
              dir="rtl"
              nextButtonLabel="التالي"
              previousButtonLabel="السابق"
            />
          </ListingRenderer>
        </ListingContent>
      </div>
    </Layout>
  );
};

export default LibraryPage;
