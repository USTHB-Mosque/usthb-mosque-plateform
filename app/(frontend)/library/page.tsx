"use client";
import React from "react";
import LibraryShell from "@/shared/layouts/user/LibraryShell";
import UserPage from "@/app/member-portal/UserPage";
import { useGetProfileQuery } from "@/features/auth/api/profile.queries";
import { Pagination } from "@/shared/common/Pagination";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import ListingContent from "@/shared/listing/ListingContent";
import ListingToolbar from "@/shared/listing/listing-toolbar/ListingToolbar";
import ListingRenderer from "@/shared/listing/ListingRenderer";
import { useGetBooksQuery } from "@/features/library/api/books.queries";
import { useSearch } from "@/shared/hooks/use-search";
import {
  BookSearchParams,
  BookCategory,
  BookType,
} from "@/features/library/types";
import { languagesConfigArray } from "@/utils/constants/data";
import BookCard from "@/features/library/components/BookCard";
import BookCardSkeleton from "@/features/library/components/BookCardSkeleton";
import EmptyData from "@/shared/common/EmptyData";
import ErrorData from "@/shared/common/ErrorData";
import {
  bookQuickTypesConfigArray,
  bookAuthorsConfigArray,
  bookTypesConfigArray,
} from "@/utils/constants/books";
import { Languages, Tag, User } from "lucide-react";

const LibraryPage: React.FC = () => {
  const { data: { user } = { user: undefined } } = useGetProfileQuery();
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

  const hero = (
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
  );

  const listing = (
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
  );

  return (
    <LibraryShell user={user}>
      {user ? (
        <UserPage title="فهرس الكتب" description="استكشف الكنوز المعرفية والكتب النادرة في مكتبة المسجد.">
          {listing}
        </UserPage>
      ) : (
        <div className="flex flex-col space-y-8 sm:space-y-12 lg:space-y-14">
          {hero}
          {listing}
        </div>
      )}
    </LibraryShell>
  );
};

export default LibraryPage;
