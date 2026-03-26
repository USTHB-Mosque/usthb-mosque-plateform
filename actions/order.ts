"use server";
import { getPayload } from "payload";
import config from "@payload-config";
import { CreateOrder } from "@/interfaces";
import { generateOrderConfirmationHtml } from "@/lib/templates/orderEmail";
import { Media } from "@/payload-types";

export const createOrder = async (order: CreateOrder, currency: string) => {
  const payload = await getPayload({
    config,
  });

  const shippingCost = await payload.findGlobal({
    slug: "shipping-cost",
  });

  const orderedProducts = await payload.find({
    collection: "products",
    where: {
      id: {
        in: order.product.map((product) => product.id),
      },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderProducts: any[] = [];

  order.product.forEach((product) => {
    const selectedProduct = orderedProducts.docs.find(
      (item) => item.id === product.id,
    );

    if (!selectedProduct) return;

    const totalPrice =
      product.quantity *
      selectedProduct.price *
      (1 - (selectedProduct.discount || 0) / 100);

    const totalPriceSecondCurrency =
      product.quantity *
      selectedProduct.priceSecondCurrency *
      (1 - (selectedProduct.discount || 0) / 100);

    const orderProduct = {
      title: selectedProduct.title,
      playerName: product.playerName,
      playerNumber: product.playerNumber,
      product: selectedProduct.id,
      quantity: product.quantity,
      size: product.size,
      price: selectedProduct.price,
      priceSecondCurrency: selectedProduct.priceSecondCurrency,
      nameAtPurchase: selectedProduct.title,
      priceAtPurchase:
        selectedProduct.price * (1 - (selectedProduct.discount || 0) / 100),
      priceSecondCurrencyAtPurchase:
        selectedProduct.priceSecondCurrency *
        (1 - (selectedProduct.discount || 0) / 100),
      totalPrice,
      totalPriceSecondCurrency,
      image: (selectedProduct.imagePreview as Media).url || "",
      audience: product.audience,
    };

    orderProducts.push(orderProduct);
  });

  const productsOverview = orderProducts
    .map((p) => {
      const details = [
        p.title,
        p.size,
        "x" + p.quantity,
        p.playerName,
        p.playerNumber,
        p.audience,
      ].filter((val) => val !== undefined && val !== null && val !== "");
      return details.join(" - ");
    })
    .join(" , ");

  const totalOrder = orderProducts.reduce(
    (acc, product) => acc + product.totalPrice,
    0,
  );

  const totalOrderSecondCurrency = orderProducts.reduce(
    (acc, product) => acc + product.totalPriceSecondCurrency,
    0,
  );

  const createdOrder = await payload.create({
    collection: "orders",
    data: {
      firstName: order.firstName,
      lastName: order.lastName,
      email: order.email,
      phone: order.phone,
      address: order.address,
      city: order.city,
      country: order.country,
      products: orderProducts,
      productsOverview,
      hasPaid: order.hasPaid ? "paid" : "not_paid",
      status: "pending",
      totalPrice: totalOrder,
      totalPriceSecondCurrency: totalOrderSecondCurrency,
    },
  });

  const html = generateOrderConfirmationHtml(
    createdOrder.id,
    order.firstName,
    order.lastName,
    orderProducts,
    totalOrder,
    totalOrderSecondCurrency,
    shippingCost.value,
    shippingCost.valueSecondCurrency,
    totalOrder + shippingCost.value,
    totalOrderSecondCurrency + shippingCost.valueSecondCurrency,
    currency,
  );

  const baseEmailOptions = {
    from: process.env.EMAIL_USER,
    to: order.email,
    subject: "Order Confirmation - Crazy Foot",
    html,
  };

  try {
    await payload.sendEmail({
      ...baseEmailOptions,
      attachments: orderProducts.map((product) => ({
        filename: product.image,
        path: product.image,
        cid: product.image,
      })),
    });
  } catch (error) {
    try {
      await payload.sendEmail(baseEmailOptions);
    } catch (fallbackError) {
      console.error("Order created but email failed:", {
        error,
        fallbackError,
        orderId: createdOrder.id,
      });
    }
  }

  return createdOrder;
};
