import gql from 'graphql-tag';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  GlobalId: { input: any; output: any; }
  Latitude: { input: any; output: any; }
  Longitude: { input: any; output: any; }
  UTCDateTime: { input: any; output: any; }
};

/** The availability of an acquisition option. */
export enum AcquisitionOptionAvailability {
  /** This option will be available for all products. */
  AllProducts = 'ALL_PRODUCTS',
  /** This option will be available for products that are in stock. */
  InstockProducts = 'INSTOCK_PRODUCTS',
  /** This option will be available for products with the the provided tag. */
  TaggedProducts = 'TAGGED_PRODUCTS'
}

/** The price type of an acquisition option. */
export enum AcquisitionOptionPriceType {
  /** The acquisition cost will be fixed. */
  Fixed = 'FIXED',
  /** The acquisition cost will be free if the order amount is above a certain threshold. */
  FreeIfAboveThreshold = 'FREE_IF_ABOVE_THRESHOLD'
}

/** The type of an acquisition. */
export enum AcquisitionType {
  /** The items will be delivered to the user. */
  Delivery = 'DELIVERY',
  /** The items will be available for immediate pickup (take items already in hand) */
  ImmediatePickup = 'IMMEDIATE_PICKUP',
  /** The items will be available for collection from the store. */
  StoreCollection = 'STORE_COLLECTION'
}

/** How to align the entity in the parent's space. */
export enum Alignment {
  /** Align the entity to the center of the parent. */
  Center = 'CENTER',
  /** Align the entity to the left of the parent. */
  Left = 'LEFT',
  /** Align the entity to the right of the parent. */
  Right = 'RIGHT'
}

export type AttributeValue = {
  __typename?: 'AttributeValue';
  parentFilterId?: Maybe<Scalars['String']['output']>;
  priority: Scalars['Float']['output'];
  value: Scalars['String']['output'];
};

export type AttributeValueInput = {
  parentFilterId?: InputMaybe<Scalars['String']['input']>;
  priority?: Scalars['Float']['input'];
  value: Scalars['String']['input'];
};

export type AttributeValueOverride = {
  __typename?: 'AttributeValueOverride';
  displayValue: Scalars['String']['output'];
  originalValue: Scalars['String']['output'];
  parentFilterId?: Maybe<Scalars['String']['output']>;
};

export type AttributeValueOverrideInput = {
  displayValue: Scalars['String']['input'];
  originalValue: Scalars['String']['input'];
  parentFilterId?: InputMaybe<Scalars['String']['input']>;
};

export type Banner = {
  __typename?: 'Banner';
  backgroundColour: Scalars['String']['output'];
  backgroundImageHorizontal?: Maybe<Scalars['String']['output']>;
  backgroundImageVertical?: Maybe<Scalars['String']['output']>;
  backgroundType: BannerBackgroundType;
  bannerText: Array<Scalars['String']['output']>;
  cloudshelf: Cloudshelf;
  /** The date and time this entity was created. */
  createdAt: Scalars['UTCDateTime']['output'];
  /** A unique internal GlobalId for this entity. */
  id: Scalars['GlobalId']['output'];
  linkProduct?: Maybe<Scalars['String']['output']>;
  linkProductGroup?: Maybe<Scalars['String']['output']>;
  linkText?: Maybe<Scalars['String']['output']>;
  linkType: BannerLinkType;
  linkURL?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  position: Scalars['Int']['output'];
  /** The date and time this entity was last updated. */
  updatedAt: Scalars['UTCDateTime']['output'];
};

export enum BannerBackgroundType {
  Image = 'IMAGE',
  SolidColour = 'SOLID_COLOUR'
}

export enum BannerDisplayMode {
  InteractiveBannersAndAttractLoop = 'INTERACTIVE_BANNERS_AND_ATTRACT_LOOP',
  InteractiveBannersUntilInteraction = 'INTERACTIVE_BANNERS_UNTIL_INTERACTION',
  NonInteractiveAfterCollection = 'NON_INTERACTIVE_AFTER_COLLECTION',
  NonInteractiveAfterLoop = 'NON_INTERACTIVE_AFTER_LOOP',
  NoBanners = 'NO_BANNERS'
}

export type BannerInput = {
  backgroundColour: Scalars['String']['input'];
  backgroundImageHorizontal?: InputMaybe<Scalars['String']['input']>;
  backgroundImageVertical?: InputMaybe<Scalars['String']['input']>;
  backgroundType: BannerBackgroundType;
  bannerText: Array<Scalars['String']['input']>;
  id: Scalars['GlobalId']['input'];
  linkProduct?: InputMaybe<Scalars['String']['input']>;
  linkProductGroup?: InputMaybe<Scalars['String']['input']>;
  linkText?: InputMaybe<Scalars['String']['input']>;
  linkType?: InputMaybe<BannerLinkType>;
  linkURL?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  position: Scalars['Int']['input'];
};

export enum BannerLinkType {
  Close = 'CLOSE',
  None = 'NONE',
  Product = 'PRODUCT',
  ProductGroup = 'PRODUCT_GROUP',
  Url = 'URL'
}

export enum BarcodeDetectionMethod {
  Keyboard = 'KEYBOARD',
  None = 'NONE'
}

export enum CapitalisationStyle {
  Capitalised = 'CAPITALISED',
  Original = 'ORIGINAL',
  Uppercase = 'UPPERCASE'
}

/** An object used to store catalog reporting stats */
export type CatalogStats = {
  __typename?: 'CatalogStats';
  asExpected: Scalars['Boolean']['output'];
  extraInformation: Scalars['String']['output'];
  numberHeldAtTimeOfReporting: Scalars['Float']['output'];
  /** The key for the value */
  reportedAt?: Maybe<Scalars['UTCDateTime']['output']>;
};

export type CategoryOrder = {
  __typename?: 'CategoryOrder';
  categoryHandle: Scalars['String']['output'];
  order: Scalars['Int']['output'];
};

/** Selects how the cloudshelf handles the checkout experience. */
export enum CheckoutExperience {
  /** Cloudshelf will use the basket checkout experience, where items are added to a basket that is visible on the screen. */
  Basket = 'BASKET',
  /** Cloudshelf will use the original checkout experience, where items are added to a basket that is not visible on the screen. */
  Classic = 'CLASSIC',
  /** Cloudshelf will not use any checkout experience. This enables "Catalog Only" mode. */
  None = 'NONE'
}

export type CheckoutFlowAcquisitionOption = {
  __typename?: 'CheckoutFlowAcquisitionOption';
  acquisitionType: AcquisitionType;
  availability: AcquisitionOptionAvailability;
  availabilityMetadataKey?: Maybe<Scalars['String']['output']>;
  availabilityMetadataValue?: Maybe<Scalars['String']['output']>;
  availabilityTag?: Maybe<Scalars['String']['output']>;
  basketValueThreshold: Scalars['Float']['output'];
  displayName: Scalars['String']['output'];
  id: Scalars['GlobalId']['output'];
  internalName: Scalars['String']['output'];
  position: Scalars['Int']['output'];
  price: Scalars['Float']['output'];
  priceType: AcquisitionOptionPriceType;
};

export type CheckoutFlowAcquisitionOptionInput = {
  acquisitionType: AcquisitionType;
  availability: AcquisitionOptionAvailability;
  availabilityMetadataKey?: InputMaybe<Scalars['String']['input']>;
  availabilityMetadataValue?: InputMaybe<Scalars['String']['input']>;
  availabilityTag?: InputMaybe<Scalars['String']['input']>;
  basketValueThreshold: Scalars['Float']['input'];
  displayName: Scalars['String']['input'];
  /** Use this field to provide either a Cloudshelf gid */
  id: Scalars['GlobalId']['input'];
  internalName: Scalars['String']['input'];
  position: Scalars['Int']['input'];
  price: Scalars['Float']['input'];
  priceType: AcquisitionOptionPriceType;
};

export type CheckoutFlowDeletePayload = {
  __typename?: 'CheckoutFlowDeletePayload';
  /** An array of CheckoutFlows that were deleted */
  checkoutFlows: Array<CheckoutFlowOptions>;
  /** An array of errors that occurred during the delete operation */
  userErrors: Array<UserError>;
};

export type CheckoutFlowEdge = {
  __typename?: 'CheckoutFlowEdge';
  /** The cursor for provided node to be used in pagination */
  cursor?: Maybe<Scalars['String']['output']>;
  /** The CheckoutFlow entity */
  node?: Maybe<CheckoutFlowOptions>;
};

export type CheckoutFlowInput = {
  acquisitionOptions?: InputMaybe<Array<CheckoutFlowAcquisitionOptionInput>>;
  allowPaymentsViaCards?: InputMaybe<Scalars['Boolean']['input']>;
  allowPaymentsViaQRCode?: InputMaybe<Scalars['Boolean']['input']>;
  collectionSlipPrinterBlocks?: InputMaybe<Array<PrinterBlockInput>>;
  /** The display name of the checkout flow */
  displayName?: InputMaybe<Scalars['String']['input']>;
  /** Use this field to provide either a Cloudshelf gid, or your own external gid. If the external gid already exists, the existing record will be updated. If the external gid does not exist, a new record will be created. */
  id?: InputMaybe<Scalars['GlobalId']['input']>;
  paymentQRCodeDestination?: InputMaybe<QrCheckoutDestination>;
  paymentQRCodeDestinationTransferBasketURL?: InputMaybe<Scalars['String']['input']>;
  paymentViaCardsAvailableForAcquisitionTypes?: InputMaybe<Array<AcquisitionType>>;
  paymentViaCardsProvider?: InputMaybe<VivawalletPaymentProviderInput>;
  paymentViaQRCodeAvailableForAcquisitionTypes?: InputMaybe<Array<AcquisitionType>>;
  purchaseReceiptPrinterBlocks?: InputMaybe<Array<PrinterBlockInput>>;
};

export type CheckoutFlowOptions = {
  __typename?: 'CheckoutFlowOptions';
  acquisitionOptions: Array<CheckoutFlowAcquisitionOption>;
  /** Whether payments can be made via credit card. (requires integration with a payment provider) */
  allowPaymentsViaCards: Scalars['Boolean']['output'];
  /** Whether payments can be made via QR code. */
  allowPaymentsViaQRCode: Scalars['Boolean']['output'];
  /** An array of Cloudshelves that use this checkout flow. */
  cloudshelves: Array<Cloudshelf>;
  collectionSlipPrinterBlocks: Array<PrinterBlocksUnion>;
  /** The date and time this entity was created. */
  createdAt: Scalars['UTCDateTime']['output'];
  /** The name of the checkout flow. */
  displayName: Scalars['String']['output'];
  /** A unique internal GlobalId for this entity. */
  id: Scalars['GlobalId']['output'];
  /** The organisation which owns this entity. */
  owningOrganisation: Organisation;
  /** The destination of the QR code checkout. */
  paymentQRCodeDestination: QrCheckoutDestination;
  paymentQRCodeDestinationTransferBasketURL?: Maybe<Scalars['String']['output']>;
  /** The types of acquisitions that are available for the card payment checkout. */
  paymentViaCardsAvailableForAcquisitionTypes: Array<AcquisitionType>;
  paymentViaCardsProvider?: Maybe<PaymentProvidersUnion>;
  /** The types of acquisitions that are available for the QR code checkout. */
  paymentViaQRCodeAvailableForAcquisitionTypes: Array<AcquisitionType>;
  /** An externally provided GlobalId */
  platformProvidedId?: Maybe<Scalars['GlobalId']['output']>;
  purchaseReceiptPrinterBlocks: Array<PrinterBlocksUnion>;
  /** The date and time this entity was last updated. */
  updatedAt: Scalars['UTCDateTime']['output'];
};

export type CheckoutFlowPageInfo = {
  __typename?: 'CheckoutFlowPageInfo';
  /** The cursor for the last node in the page */
  endCursor?: Maybe<Scalars['String']['output']>;
  /** Whether or not there is a another page of data */
  hasNextPage: Scalars['Boolean']['output'];
  /** Whether or not there is a previous page of data */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** The cursor for the first node in the page */
  startCursor?: Maybe<Scalars['String']['output']>;
};

export type CheckoutFlowPaginatedPayload = {
  __typename?: 'CheckoutFlowPaginatedPayload';
  edges?: Maybe<Array<CheckoutFlowEdge>>;
  pageInfo?: Maybe<CheckoutFlowPageInfo>;
  /** The total number of items available */
  totalCount: Scalars['Int']['output'];
};

export type CheckoutFlowUpsertPayload = {
  __typename?: 'CheckoutFlowUpsertPayload';
  /** An array of CheckoutFlows that were created or updated */
  checkoutFlows: Array<CheckoutFlowOptions>;
  /** An array of errors that occurred during the upsert operation */
  userErrors: Array<UserError>;
};

export enum ClearSalesAssistantRule {
  Daily = 'DAILY',
  Never = 'NEVER',
  SessionEnd = 'SESSION_END'
}

export type Cloudshelf = {
  __typename?: 'Cloudshelf';
  addScannedProductsToBasket: Scalars['Boolean']['output'];
  attractLoopHomeScreenPlacementX: Scalars['Int']['output'];
  attractLoopIncludeBanners: Scalars['Boolean']['output'];
  attractLoopIncludeHomeScreen: Scalars['Boolean']['output'];
  attractLoopIncludeProductGroups: Scalars['Boolean']['output'];
  attractLoopItemMinimumDuration: Scalars['Int']['output'];
  banners: Array<Banner>;
  checkoutExperience: CheckoutExperience;
  checkoutFlow: CheckoutFlowOptions;
  content: Array<CloudshelfContent>;
  /** The date and time this entity was created. */
  createdAt: Scalars['UTCDateTime']['output'];
  devices: Array<Device>;
  displayDiscountCodeEntry: Scalars['Boolean']['output'];
  displayHomeFrame: Scalars['Boolean']['output'];
  displayInStockLabel: Scalars['Boolean']['output'];
  displayLimitedSelectionLabel: Scalars['Boolean']['output'];
  displayName: Scalars['String']['output'];
  displayOnOrderLabel: Scalars['Boolean']['output'];
  displaySoldOutLabel: Scalars['Boolean']['output'];
  displayStockCount: Scalars['Boolean']['output'];
  engagements: Array<Session>;
  filterExtractionPending: Scalars['Boolean']['output'];
  filters: Array<Filter>;
  homeFrameCallToAction: Scalars['String']['output'];
  homeFrameCallToActionAlignment: Alignment;
  homeFrameCallToActionSize: Size;
  /** A unique internal GlobalId for this entity. */
  id: Scalars['GlobalId']['output'];
  inStockLabel?: Maybe<Scalars['String']['output']>;
  includeOnOrderProducts: Scalars['Boolean']['output'];
  includeOutOfStockProducts: Scalars['Boolean']['output'];
  includedFilterConfig: Array<CloudshelfIncludableFilter>;
  limitedSelectionLabel?: Maybe<Scalars['String']['output']>;
  nonInteractiveBannerDisplayMode: BannerDisplayMode;
  nonInteractiveBannerShowDurationInSeconds: Scalars['Int']['output'];
  nonInteractiveCollectionType: NonInteractiveCollectionType;
  nonInteractiveIncludeLandscapeImages: Scalars['Boolean']['output'];
  nonInteractiveIncludePortraitImages: Scalars['Boolean']['output'];
  nonInteractiveIncludeProductName: Scalars['Boolean']['output'];
  nonInteractiveIncludeProductPrice: Scalars['Boolean']['output'];
  nonInteractiveIncludeProductQRCode: Scalars['Boolean']['output'];
  nonInteractiveIncludeProductStock: Scalars['Boolean']['output'];
  nonInteractiveIncludeSquareImages: Scalars['Boolean']['output'];
  nonInteractiveMaximumImagesPerProduct: Scalars['Int']['output'];
  nonInteractiveMaximumProductsPerCollection: Scalars['Int']['output'];
  nonInteractiveMinimumImageQuality: ImageQuality;
  nonInteractiveProductImageDurationInSeconds: Scalars['Int']['output'];
  onOrderLabel?: Maybe<Scalars['String']['output']>;
  owningOrganisation: Organisation;
  pdpBlocks: Array<PdpBlockUnion>;
  pdpIncludeSuggestedItems: Scalars['Boolean']['output'];
  /** An externally provided GlobalId */
  platformProvidedId?: Maybe<Scalars['GlobalId']['output']>;
  productGridIncludeBrand: Scalars['Boolean']['output'];
  soldOutLabel?: Maybe<Scalars['String']['output']>;
  theme: Theme;
  /** The date and time this entity was last updated. */
  updatedAt: Scalars['UTCDateTime']['output'];
};


export type CloudshelfEngagementsArgs = {
  endDate?: InputMaybe<Scalars['UTCDateTime']['input']>;
  startDate?: InputMaybe<Scalars['UTCDateTime']['input']>;
};

export type CloudshelfContent = {
  __typename?: 'CloudshelfContent';
  cloudshelf: Cloudshelf;
  configurationIssues: Array<ContentConfigurationIssue>;
  contentType: ContentType;
  /** The date and time this entity was created. */
  createdAt: Scalars['UTCDateTime']['output'];
  displayName: Scalars['String']['output'];
  /** A unique internal GlobalId for this entity. */
  id: Scalars['GlobalId']['output'];
  position: Scalars['Int']['output'];
  powerTileBackgroundImage?: Maybe<Scalars['String']['output']>;
  powerTileBackgroundPrimaryColour?: Maybe<Scalars['String']['output']>;
  powerTileBackgroundSecondaryColour?: Maybe<Scalars['String']['output']>;
  powerTileBackgroundType?: Maybe<PowerTileBackgroundType>;
  powerTileCallToAction?: Maybe<Scalars['String']['output']>;
  powerTileIcon?: Maybe<Scalars['String']['output']>;
  powerTileQRText?: Maybe<Scalars['String']['output']>;
  powerTileQRURL?: Maybe<Scalars['String']['output']>;
  powerTileUseIcon?: Maybe<Scalars['Boolean']['output']>;
  productGroup?: Maybe<ProductGroup>;
  productGroupAlternativeImage?: Maybe<Scalars['String']['output']>;
  productGroupBackgroundImageHorizontal?: Maybe<Scalars['String']['output']>;
  productGroupBackgroundImageVertical?: Maybe<Scalars['String']['output']>;
  productGroupBannerText?: Maybe<Array<Scalars['String']['output']>>;
  productGroupCallToAction?: Maybe<Scalars['String']['output']>;
  productGroupCallToActionDisplayCTA?: Maybe<Scalars['Boolean']['output']>;
  productGroupIsUpsellContent?: Maybe<Scalars['Boolean']['output']>;
  productGroupUseAlternativeImage?: Maybe<Scalars['Boolean']['output']>;
  productGroupVisibleInAttractLoop?: Maybe<Scalars['Boolean']['output']>;
  /** TileSize.Mixed will not be accepted for this field. */
  tileSize: TileSize;
  /** The date and time this entity was last updated. */
  updatedAt: Scalars['UTCDateTime']['output'];
};

export type CloudshelfContentInput = {
  contentType: ContentType;
  displayName: Scalars['String']['input'];
  id: Scalars['GlobalId']['input'];
  position: Scalars['Int']['input'];
  powerTileBackgroundImage?: InputMaybe<Scalars['String']['input']>;
  powerTileBackgroundPrimaryColour?: InputMaybe<Scalars['String']['input']>;
  powerTileBackgroundSecondaryColour?: InputMaybe<Scalars['String']['input']>;
  powerTileBackgroundType?: InputMaybe<PowerTileBackgroundType>;
  powerTileCallToAction?: InputMaybe<Scalars['String']['input']>;
  powerTileIcon?: InputMaybe<Scalars['String']['input']>;
  powerTileQRText?: InputMaybe<Scalars['String']['input']>;
  powerTileQRURL?: InputMaybe<Scalars['String']['input']>;
  powerTileUseIcon?: InputMaybe<Scalars['Boolean']['input']>;
  productGroupAlternativeImage?: InputMaybe<Scalars['String']['input']>;
  productGroupBackgroundImageHorizontal?: InputMaybe<Scalars['String']['input']>;
  productGroupBackgroundImageVertical?: InputMaybe<Scalars['String']['input']>;
  productGroupBannerText?: InputMaybe<Array<Scalars['String']['input']>>;
  productGroupCallToAction?: InputMaybe<Scalars['String']['input']>;
  productGroupCallToActionDisplayCTA?: InputMaybe<Scalars['Boolean']['input']>;
  productGroupId?: InputMaybe<Scalars['GlobalId']['input']>;
  productGroupIsUpsellContent?: InputMaybe<Scalars['Boolean']['input']>;
  productGroupUseAlternativeImage?: InputMaybe<Scalars['Boolean']['input']>;
  productGroupVisibleInAttractLoop?: InputMaybe<Scalars['Boolean']['input']>;
  tileSize: TileSize;
};

export type CloudshelfDeletePayload = {
  __typename?: 'CloudshelfDeletePayload';
  /** An array of Cloudshelves that were deleted */
  cloudshelves: Array<Cloudshelf>;
  /** An array of errors that occurred during the delete operation */
  userErrors: Array<UserError>;
};

export type CloudshelfDetailsPrinterBlock = {
  __typename?: 'CloudshelfDetailsPrinterBlock';
  id: Scalars['GlobalId']['output'];
  position: Scalars['Int']['output'];
  printerBlockDiscriminator: Scalars['String']['output'];
};

export type CloudshelfDuplicatePayload = {
  __typename?: 'CloudshelfDuplicatePayload';
  /** An array of errors that occurred during the duplication operation */
  userErrors: Array<UserError>;
};

export type CloudshelfEdge = {
  __typename?: 'CloudshelfEdge';
  /** The cursor for provided node to be used in pagination */
  cursor?: Maybe<Scalars['String']['output']>;
  /** The Cloudshelf entity */
  node?: Maybe<Cloudshelf>;
};

export type CloudshelfEnginePayload = {
  __typename?: 'CloudshelfEnginePayload';
  cloudshelf?: Maybe<Cloudshelf>;
  device?: Maybe<Device>;
  engineType: EngineType;
  errorMessage?: Maybe<Scalars['String']['output']>;
  handoffPayload?: Maybe<HandoffPayload>;
  inMaintenanceMode: Scalars['Boolean']['output'];
  owningOrganisation?: Maybe<Organisation>;
  plugins: Array<Plugin>;
  salesAssistants: Array<SalesAssistant>;
  status: CloudshelfPayloadStatus;
};

export type CloudshelfIncludableFilter = {
  __typename?: 'CloudshelfIncludableFilter';
  extractionStatus: FilterExtractionStatus;
  filterType: Scalars['String']['output'];
  metadataKey?: Maybe<Scalars['String']['output']>;
};

export type CloudshelfIncludableFilterInput = {
  extractionStatus: FilterExtractionStatus;
  filterType: Scalars['String']['input'];
  metadataKey?: InputMaybe<Scalars['String']['input']>;
};

export type CloudshelfInput = {
  addScannedProductsToBasket?: InputMaybe<Scalars['Boolean']['input']>;
  attractLoopHomeScreenPlacementX?: InputMaybe<Scalars['Int']['input']>;
  attractLoopIncludeBanners?: InputMaybe<Scalars['Boolean']['input']>;
  attractLoopIncludeHomeScreen?: InputMaybe<Scalars['Boolean']['input']>;
  attractLoopIncludeProductGroups?: InputMaybe<Scalars['Boolean']['input']>;
  attractLoopItemMinimumDuration?: InputMaybe<Scalars['Int']['input']>;
  banners?: InputMaybe<Array<BannerInput>>;
  checkoutExperience?: InputMaybe<CheckoutExperience>;
  /** The GlobalID of the checkout flow to apply to this Cloudshelf */
  checkoutFlowId?: InputMaybe<Scalars['GlobalId']['input']>;
  content?: InputMaybe<Array<CloudshelfContentInput>>;
  displayDiscountCodeEntry?: InputMaybe<Scalars['Boolean']['input']>;
  displayHomeFrame?: InputMaybe<Scalars['Boolean']['input']>;
  displayInStockLabel?: InputMaybe<Scalars['Boolean']['input']>;
  displayLimitedSelectionLabel?: InputMaybe<Scalars['Boolean']['input']>;
  /** The display name of the cloudshelf */
  displayName?: InputMaybe<Scalars['String']['input']>;
  displayOnOrderLabel?: InputMaybe<Scalars['Boolean']['input']>;
  displaySoldOutLabel?: InputMaybe<Scalars['Boolean']['input']>;
  displayStockCount?: InputMaybe<Scalars['Boolean']['input']>;
  filters?: InputMaybe<Array<FilterInput>>;
  homeFrameCallToAction?: InputMaybe<Scalars['String']['input']>;
  homeFrameCallToActionAlignment?: InputMaybe<Alignment>;
  homeFrameCallToActionSize?: InputMaybe<Size>;
  /** Use this field to provide either a Cloudshelf gid, or your own external gid. If the external gid already exists, the existing record will be updated. If the external gid does not exist, a new record will be created. */
  id?: InputMaybe<Scalars['GlobalId']['input']>;
  inStockLabel?: InputMaybe<Scalars['String']['input']>;
  includeOnOrderProducts?: InputMaybe<Scalars['Boolean']['input']>;
  includeOutOfStockProducts?: InputMaybe<Scalars['Boolean']['input']>;
  includedFilterConfig?: InputMaybe<Array<CloudshelfIncludableFilterInput>>;
  limitedSelectionLabel?: InputMaybe<Scalars['String']['input']>;
  nonInteractiveBannerDisplayMode?: InputMaybe<BannerDisplayMode>;
  nonInteractiveBannerShowDurationInSeconds?: InputMaybe<Scalars['Int']['input']>;
  nonInteractiveCollectionType?: InputMaybe<NonInteractiveCollectionType>;
  nonInteractiveIncludeLandscapeImages?: InputMaybe<Scalars['Boolean']['input']>;
  nonInteractiveIncludePortraitImages?: InputMaybe<Scalars['Boolean']['input']>;
  nonInteractiveIncludeProductName?: InputMaybe<Scalars['Boolean']['input']>;
  nonInteractiveIncludeProductPrice?: InputMaybe<Scalars['Boolean']['input']>;
  nonInteractiveIncludeProductQRCode?: InputMaybe<Scalars['Boolean']['input']>;
  nonInteractiveIncludeProductStock?: InputMaybe<Scalars['Boolean']['input']>;
  nonInteractiveIncludeSquareImages?: InputMaybe<Scalars['Boolean']['input']>;
  nonInteractiveMaximumImagesPerProduct?: InputMaybe<Scalars['Int']['input']>;
  nonInteractiveMaximumProductsPerCollection?: InputMaybe<Scalars['Int']['input']>;
  nonInteractiveMinimumImageQuality?: InputMaybe<ImageQuality>;
  nonInteractiveProductImageDurationInSeconds?: InputMaybe<Scalars['Int']['input']>;
  onOrderLabel?: InputMaybe<Scalars['String']['input']>;
  pdpBlocks?: InputMaybe<Array<PdpBlockInput>>;
  pdpIncludeSuggestedItems?: InputMaybe<Scalars['Boolean']['input']>;
  productGridIncludeBrand?: InputMaybe<Scalars['Boolean']['input']>;
  /** Whether or not to use randomly selected content or not. Only takes affect for newly created Cloudshelves */
  randomContent?: InputMaybe<Scalars['Boolean']['input']>;
  soldOutLabel?: InputMaybe<Scalars['String']['input']>;
  /** The GlobalID of the theme to apply to this Cloudshelf */
  themeId?: InputMaybe<Scalars['GlobalId']['input']>;
};

export type CloudshelfPageInfo = {
  __typename?: 'CloudshelfPageInfo';
  /** The cursor for the last node in the page */
  endCursor?: Maybe<Scalars['String']['output']>;
  /** Whether or not there is a another page of data */
  hasNextPage: Scalars['Boolean']['output'];
  /** Whether or not there is a previous page of data */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** The cursor for the first node in the page */
  startCursor?: Maybe<Scalars['String']['output']>;
};

export type CloudshelfPaginatedPayload = {
  __typename?: 'CloudshelfPaginatedPayload';
  edges?: Maybe<Array<CloudshelfEdge>>;
  pageInfo?: Maybe<CloudshelfPageInfo>;
  /** The total number of items available */
  totalCount: Scalars['Int']['output'];
};

export enum CloudshelfPayloadStatus {
  Cached = 'CACHED',
  CloudshelfPreview = 'CLOUDSHELF_PREVIEW',
  DeviceNoCloudshelf = 'DEVICE_NO_CLOUDSHELF',
  DeviceRemoved = 'DEVICE_REMOVED',
  DeviceWithoutLocation = 'DEVICE_WITHOUT_LOCATION',
  DeviceWithCloudshelf = 'DEVICE_WITH_CLOUDSHELF',
  Error = 'ERROR',
  Frozen = 'FROZEN',
  MobileHandoff = 'MOBILE_HANDOFF',
  Notfound = 'NOTFOUND'
}

export enum CloudshelfPayloadType {
  Device = 'DEVICE',
  Handoff = 'HANDOFF',
  Preview = 'PREVIEW'
}

export type CloudshelfUpsertPayload = {
  __typename?: 'CloudshelfUpsertPayload';
  /** An array of Cloudshelves that were created or updated */
  cloudshelves: Array<Cloudshelf>;
  /** An array of errors that occurred during the upsert operation */
  userErrors: Array<UserError>;
};

export type ComplexSession = {
  __typename?: 'ComplexSession';
  addedToBasket: Scalars['Boolean']['output'];
  basketCurrency: CurrencyCode;
  basketScanned: Scalars['Boolean']['output'];
  basketValue: Scalars['String']['output'];
  checkoutCompleted: Scalars['Boolean']['output'];
  cloudshelf: Scalars['String']['output'];
  device: Scalars['String']['output'];
  /** A unique internal GlobalId for this entity. */
  id: Scalars['GlobalId']['output'];
  location: Scalars['String']['output'];
  occurredAt: Scalars['UTCDateTime']['output'];
  orderStatus?: Maybe<Scalars['String']['output']>;
  orderUrl?: Maybe<Scalars['String']['output']>;
  salesPerson?: Maybe<Scalars['String']['output']>;
  sessionDuration: Scalars['Float']['output'];
  viewedCheckoutQR: Scalars['Boolean']['output'];
};

export type ComplexSessionEdge = {
  __typename?: 'ComplexSessionEdge';
  /** The cursor for provided node to be used in pagination */
  cursor?: Maybe<Scalars['String']['output']>;
  /** The ComplexSession entity */
  node?: Maybe<ComplexSession>;
};

export type ComplexSessionPageInfo = {
  __typename?: 'ComplexSessionPageInfo';
  /** The cursor for the last node in the page */
  endCursor?: Maybe<Scalars['String']['output']>;
  /** Whether or not there is a another page of data */
  hasNextPage: Scalars['Boolean']['output'];
  /** Whether or not there is a previous page of data */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** The cursor for the first node in the page */
  startCursor?: Maybe<Scalars['String']['output']>;
};

export enum ContentConfigurationIssue {
  Cta = 'CTA',
  QrUrl = 'QR_URL',
  Text = 'TEXT'
}

export enum ContentType {
  PowerTile = 'POWER_TILE',
  ProductGroup = 'PRODUCT_GROUP'
}

/** The code designating a country/region, which generally follows ISO 3166-1 alpha-2 guidelines. If a territory doesn't have a country code value in the CountryCode enum, then it might be considered a subdivision of another country. For example, the territories associated with Spain are represented by the country code ES, and the territories associated with the United States of America are represented by the country code US. */
export enum CountryCode {
  /** Ascension Island */
  Ac = 'AC',
  /** Andorra */
  Ad = 'AD',
  /** United Arab Emirates */
  Ae = 'AE',
  /** Afghanistan */
  Af = 'AF',
  /** Antigua & Barbuda */
  Ag = 'AG',
  /** Anguilla */
  Ai = 'AI',
  /** Albania */
  Al = 'AL',
  /** Armenia */
  Am = 'AM',
  /** Netherlands Antilles */
  An = 'AN',
  /** Angola */
  Ao = 'AO',
  /** Argentina */
  Ar = 'AR',
  /** Austria */
  At = 'AT',
  /** Australia */
  Au = 'AU',
  /** Aruba */
  Aw = 'AW',
  /** Åland Islands */
  Ax = 'AX',
  /** Azerbaijan */
  Az = 'AZ',
  /** Bosnia & Herzegovina */
  Ba = 'BA',
  /** Barbados */
  Bb = 'BB',
  /** Bangladesh */
  Bd = 'BD',
  /** Belgium */
  Be = 'BE',
  /** Burkina Faso */
  Bf = 'BF',
  /** Bulgaria */
  Bg = 'BG',
  /** Bahrain */
  Bh = 'BH',
  /** Burundi */
  Bi = 'BI',
  /** Benin */
  Bj = 'BJ',
  /** St. Barthélemy */
  Bl = 'BL',
  /** Bermuda */
  Bm = 'BM',
  /** Brunei */
  Bn = 'BN',
  /** Bolivia */
  Bo = 'BO',
  /** Caribbean Netherlands */
  Bq = 'BQ',
  /** Brazil */
  Br = 'BR',
  /** Bahamas */
  Bs = 'BS',
  /** Bhutan */
  Bt = 'BT',
  /** Bouvet Island */
  Bv = 'BV',
  /** Botswana */
  Bw = 'BW',
  /** Belarus */
  By = 'BY',
  /** Belize */
  Bz = 'BZ',
  /** Canada */
  Ca = 'CA',
  /** Cocos (Keeling) Islands */
  Cc = 'CC',
  /** Congo - Kinshasa */
  Cd = 'CD',
  /** Central African Republic */
  Cf = 'CF',
  /** Congo - Brazzaville */
  Cg = 'CG',
  /** Switzerland */
  Ch = 'CH',
  /** Côte d’Ivoire */
  Ci = 'CI',
  /** Cook Islands */
  Ck = 'CK',
  /** Chile */
  Cl = 'CL',
  /** Cameroon */
  Cm = 'CM',
  /** China */
  Cn = 'CN',
  /** Colombia */
  Co = 'CO',
  /** Costa Rica */
  Cr = 'CR',
  /** Cuba */
  Cu = 'CU',
  /** Cape Verde */
  Cv = 'CV',
  /** Curaçao */
  Cw = 'CW',
  /** Christmas Island */
  Cx = 'CX',
  /** Cyprus */
  Cy = 'CY',
  /** Czechia */
  Cz = 'CZ',
  /** Germany */
  De = 'DE',
  /** Djibouti */
  Dj = 'DJ',
  /** Denmark */
  Dk = 'DK',
  /** Dominica */
  Dm = 'DM',
  /** Dominican Republic */
  Do = 'DO',
  /** Algeria */
  Dz = 'DZ',
  /** Ecuador */
  Ec = 'EC',
  /** Estonia */
  Ee = 'EE',
  /** Egypt */
  Eg = 'EG',
  /** Western Sahara */
  Eh = 'EH',
  /** Eritrea */
  Er = 'ER',
  /** Spain */
  Es = 'ES',
  /** Ethiopia */
  Et = 'ET',
  /** Finland */
  Fi = 'FI',
  /** Fiji */
  Fj = 'FJ',
  /** Falkland Islands */
  Fk = 'FK',
  /** Faroe Islands */
  Fo = 'FO',
  /** France */
  Fr = 'FR',
  /** Gabon */
  Ga = 'GA',
  /** United Kingdom */
  Gb = 'GB',
  /** Grenada */
  Gd = 'GD',
  /** Georgia */
  Ge = 'GE',
  /** French Guiana */
  Gf = 'GF',
  /** Guernsey */
  Gg = 'GG',
  /** Ghana */
  Gh = 'GH',
  /** Gibraltar */
  Gi = 'GI',
  /** Greenland */
  Gl = 'GL',
  /** Gambia */
  Gm = 'GM',
  /** Guinea */
  Gn = 'GN',
  /** Guadeloupe */
  Gp = 'GP',
  /** Equatorial Guinea */
  Gq = 'GQ',
  /** Greece */
  Gr = 'GR',
  /** South Georgia & South Sandwich Islands */
  Gs = 'GS',
  /** Guatemala */
  Gt = 'GT',
  /** Guinea-Bissau */
  Gw = 'GW',
  /** Guyana */
  Gy = 'GY',
  /** Hong Kong SAR China */
  Hk = 'HK',
  /** Heard & McDonald Islands */
  Hm = 'HM',
  /** Honduras */
  Hn = 'HN',
  /** Croatia */
  Hr = 'HR',
  /** Haiti */
  Ht = 'HT',
  /** Hungary */
  Hu = 'HU',
  /** Indonesia */
  Id = 'ID',
  /** Ireland */
  Ie = 'IE',
  /** Israel */
  Il = 'IL',
  /** Isle of Man */
  Im = 'IM',
  /** India */
  In = 'IN',
  /** British Indian Ocean Territory */
  Io = 'IO',
  /** Iraq */
  Iq = 'IQ',
  /** Iran */
  Ir = 'IR',
  /** Iceland */
  Is = 'IS',
  /** Italy */
  It = 'IT',
  /** Jersey */
  Je = 'JE',
  /** Jamaica */
  Jm = 'JM',
  /** Jordan */
  Jo = 'JO',
  /** Japan */
  Jp = 'JP',
  /** Kenya */
  Ke = 'KE',
  /** Kyrgyzstan */
  Kg = 'KG',
  /** Cambodia */
  Kh = 'KH',
  /** Kiribati */
  Ki = 'KI',
  /** Comoros */
  Km = 'KM',
  /** St. Kitts & Nevis */
  Kn = 'KN',
  /** North Korea */
  Kp = 'KP',
  /** South Korea */
  Kr = 'KR',
  /** Kuwait */
  Kw = 'KW',
  /** Cayman Islands */
  Ky = 'KY',
  /** Kazakhstan */
  Kz = 'KZ',
  /** Laos */
  La = 'LA',
  /** Lebanon */
  Lb = 'LB',
  /** St. Lucia */
  Lc = 'LC',
  /** Liechtenstein */
  Li = 'LI',
  /** Sri Lanka */
  Lk = 'LK',
  /** Liberia */
  Lr = 'LR',
  /** Lesotho */
  Ls = 'LS',
  /** Lithuania */
  Lt = 'LT',
  /** Luxembourg */
  Lu = 'LU',
  /** Latvia */
  Lv = 'LV',
  /** Libya */
  Ly = 'LY',
  /** Morocco */
  Ma = 'MA',
  /** Monaco */
  Mc = 'MC',
  /** Moldova */
  Md = 'MD',
  /** Montenegro */
  Me = 'ME',
  /** St. Martin */
  Mf = 'MF',
  /** Madagascar */
  Mg = 'MG',
  /** North Macedonia */
  Mk = 'MK',
  /** Mali */
  Ml = 'ML',
  /** Myanmar (Burma) */
  Mm = 'MM',
  /** Mongolia */
  Mn = 'MN',
  /** Macao SAR China */
  Mo = 'MO',
  /** Martinique */
  Mq = 'MQ',
  /** Mauritania */
  Mr = 'MR',
  /** Montserrat */
  Ms = 'MS',
  /** Malta */
  Mt = 'MT',
  /** Mauritius */
  Mu = 'MU',
  /** Maldives */
  Mv = 'MV',
  /** Malawi */
  Mw = 'MW',
  /** Mexico */
  Mx = 'MX',
  /** Malaysia */
  My = 'MY',
  /** Mozambique */
  Mz = 'MZ',
  /** Namibia */
  Na = 'NA',
  /** New Caledonia */
  Nc = 'NC',
  /** Niger */
  Ne = 'NE',
  /** Norfolk Island */
  Nf = 'NF',
  /** Nigeria */
  Ng = 'NG',
  /** Nicaragua */
  Ni = 'NI',
  /** Netherlands */
  Nl = 'NL',
  /** Norway */
  No = 'NO',
  /** Nepal */
  Np = 'NP',
  /** Nauru */
  Nr = 'NR',
  /** Niue */
  Nu = 'NU',
  /** New Zealand */
  Nz = 'NZ',
  /** Oman */
  Om = 'OM',
  /** Panama */
  Pa = 'PA',
  /** Peru */
  Pe = 'PE',
  /** French Polynesia */
  Pf = 'PF',
  /** Papua New Guinea */
  Pg = 'PG',
  /** Philippines */
  Ph = 'PH',
  /** Pakistan */
  Pk = 'PK',
  /** Poland */
  Pl = 'PL',
  /** St. Pierre & Miquelon */
  Pm = 'PM',
  /** Pitcairn Islands */
  Pn = 'PN',
  /** Palestinian Territories */
  Ps = 'PS',
  /** Portugal */
  Pt = 'PT',
  /** Paraguay */
  Py = 'PY',
  /** Qatar */
  Qa = 'QA',
  /** Réunion */
  Re = 'RE',
  /** Romania */
  Ro = 'RO',
  /** Serbia */
  Rs = 'RS',
  /** Russia */
  Ru = 'RU',
  /** Rwanda */
  Rw = 'RW',
  /** Saudi Arabia */
  Sa = 'SA',
  /** Solomon Islands */
  Sb = 'SB',
  /** Seychelles */
  Sc = 'SC',
  /** Sudan */
  Sd = 'SD',
  /** Sweden */
  Se = 'SE',
  /** Singapore */
  Sg = 'SG',
  /** St. Helena */
  Sh = 'SH',
  /** Slovenia */
  Si = 'SI',
  /** Svalbard & Jan Mayen */
  Sj = 'SJ',
  /** Slovakia */
  Sk = 'SK',
  /** Sierra Leone */
  Sl = 'SL',
  /** San Marino */
  Sm = 'SM',
  /** Senegal */
  Sn = 'SN',
  /** Somalia */
  So = 'SO',
  /** Suriname */
  Sr = 'SR',
  /** South Sudan */
  Ss = 'SS',
  /** São Tomé & Príncipe */
  St = 'ST',
  /** El Salvador */
  Sv = 'SV',
  /** Sint Maarten */
  Sx = 'SX',
  /** Syria */
  Sy = 'SY',
  /** Eswatini */
  Sz = 'SZ',
  /** Tristan da Cunha */
  Ta = 'TA',
  /** Turks & Caicos Islands */
  Tc = 'TC',
  /** Chad */
  Td = 'TD',
  /** French Southern Territories */
  Tf = 'TF',
  /** Togo */
  Tg = 'TG',
  /** Thailand */
  Th = 'TH',
  /** Tajikistan */
  Tj = 'TJ',
  /** Tokelau */
  Tk = 'TK',
  /** Timor-Leste */
  Tl = 'TL',
  /** Turkmenistan */
  Tm = 'TM',
  /** Tunisia */
  Tn = 'TN',
  /** Tonga */
  To = 'TO',
  /** Turkey */
  Tr = 'TR',
  /** Trinidad & Tobago */
  Tt = 'TT',
  /** Tuvalu */
  Tv = 'TV',
  /** Taiwan */
  Tw = 'TW',
  /** Tanzania */
  Tz = 'TZ',
  /** Ukraine */
  Ua = 'UA',
  /** Uganda */
  Ug = 'UG',
  /** U.S. Outlying Islands */
  Um = 'UM',
  /** United States */
  Us = 'US',
  /** Uruguay */
  Uy = 'UY',
  /** Uzbekistan */
  Uz = 'UZ',
  /** Vatican City */
  Va = 'VA',
  /** St. Vincent & Grenadines */
  Vc = 'VC',
  /** Venezuela */
  Ve = 'VE',
  /** British Virgin Islands */
  Vg = 'VG',
  /** Vietnam */
  Vn = 'VN',
  /** Vanuatu */
  Vu = 'VU',
  /** Wallis & Futuna */
  Wf = 'WF',
  /** Samoa */
  Ws = 'WS',
  /** Kosovo */
  Xk = 'XK',
  /** Yemen */
  Ye = 'YE',
  /** Mayotte */
  Yt = 'YT',
  /** South Africa */
  Za = 'ZA',
  /** Zambia */
  Zm = 'ZM',
  /** Zimbabwe */
  Zw = 'ZW',
  /** Unknown Region */
  Zz = 'ZZ'
}

export type CreatePaidOrderInput = {
  acquisitionOptionId: Scalars['GlobalId']['input'];
  attemptId: Scalars['String']['input'];
  basketId: Scalars['GlobalId']['input'];
  emailAddress: Scalars['String']['input'];
  onDevicePaymentId?: InputMaybe<Scalars['String']['input']>;
  sessionId: Scalars['GlobalId']['input'];
  token: Scalars['String']['input'];
};

export type CreatePaidOrderPayload = {
  __typename?: 'CreatePaidOrderPayload';
  message?: Maybe<Scalars['String']['output']>;
  order?: Maybe<ThirdPartyOrder>;
  success: Scalars['Boolean']['output'];
};

export enum CurrencyCode {
  /** United Arab Emirates Dirham */
  Aed = 'AED',
  /** Australian Dollar */
  Aud = 'AUD',
  /** Bulgarian Lev */
  Bgn = 'BGN',
  /** Canadian Dollar */
  Cad = 'CAD',
  /** Swiss Franc */
  Chf = 'CHF',
  /** Chilean Peso */
  Clp = 'CLP',
  /** Czech Koruna */
  Czk = 'CZK',
  /** Danish Krone */
  Ddk = 'DDK',
  /** Euro */
  Eur = 'EUR',
  /** Great British Pound */
  Gbp = 'GBP',
  /** Hungarian Forint */
  Huf = 'HUF',
  /** Israeli New Shekel */
  Ils = 'ILS',
  /** Peruvian Sol */
  Pen = 'PEN',
  /** Polish Zloty */
  Pln = 'PLN',
  /** Romanian Leu */
  Ron = 'RON',
  /** Saudi Arabian Riyal */
  Sar = 'SAR',
  /** Swedish Krona */
  Sek = 'SEK',
  Unknown = 'UNKNOWN',
  /** United States Dollar */
  Usd = 'USD'
}

export type CustomCssInput = {
  allowCustomCSS?: InputMaybe<Scalars['Boolean']['input']>;
  allowCustomCSSRetailerChanges?: InputMaybe<Scalars['Boolean']['input']>;
  id: Scalars['GlobalId']['input'];
};

export type CustomIntegrationFullSignupResultPayload = {
  __typename?: 'CustomIntegrationFullSignupResultPayload';
  successful: Scalars['Boolean']['output'];
  /** An array of errors that occurred during the sign up operation */
  userErrors: Array<UserError>;
};

export type Device = {
  __typename?: 'Device';
  barcodeDetectionMethod: BarcodeDetectionMethod;
  cloudshelf?: Maybe<Cloudshelf>;
  /** The date and time this entity was created. */
  createdAt: Scalars['UTCDateTime']['output'];
  /** The uptime records which belong to this organisation. */
  deviceUptimeRecords: Array<DeviceUptimeRecord>;
  displayName: Scalars['String']['output'];
  engineInfo?: Maybe<Scalars['String']['output']>;
  engineOrientation?: Maybe<EngineOrientation>;
  engineSeenSinceLastChange: Scalars['Boolean']['output'];
  engineSizeInfo?: Maybe<Scalars['String']['output']>;
  engineType?: Maybe<EngineType>;
  engineUserAgent?: Maybe<Scalars['String']['output']>;
  engineVersionLastSeen?: Maybe<Scalars['String']['output']>;
  /** A unique internal GlobalId for this entity. */
  id: Scalars['GlobalId']['output'];
  lastSeen?: Maybe<Scalars['UTCDateTime']['output']>;
  location?: Maybe<Location>;
  owningOrganisation?: Maybe<Organisation>;
  /** An externally provided GlobalId */
  platformProvidedId?: Maybe<Scalars['GlobalId']['output']>;
  registered: Scalars['Boolean']['output'];
  registrationCode: Scalars['String']['output'];
  screenSizeInches: Scalars['Float']['output'];
  status: EngineStatus;
  /** The date and time this entity was last updated. */
  updatedAt: Scalars['UTCDateTime']['output'];
  /** An array of KeyValuePairs which contain user provided variables to be used by this device. */
  variables: Array<KeyValuePair>;
  visibilityType?: Maybe<VisibilityType>;
};

export type DeviceDeletePayload = {
  __typename?: 'DeviceDeletePayload';
  /** An array of Devices that were deleted */
  devices: Array<Device>;
  /** An array of errors that occurred during the delete operation */
  userErrors: Array<UserError>;
};

export type DeviceDetailsPrinterBlock = {
  __typename?: 'DeviceDetailsPrinterBlock';
  id: Scalars['GlobalId']['output'];
  position: Scalars['Int']['output'];
  printerBlockDiscriminator: Scalars['String']['output'];
};

export type DeviceEdge = {
  __typename?: 'DeviceEdge';
  /** The cursor for provided node to be used in pagination */
  cursor?: Maybe<Scalars['String']['output']>;
  /** The Device entity */
  node?: Maybe<Device>;
};

export type DeviceEngagementRecord = {
  __typename?: 'DeviceEngagementRecord';
  count: Scalars['Int']['output'];
  date: Scalars['UTCDateTime']['output'];
  deviceId: Scalars['String']['output'];
  deviceName: Scalars['String']['output'];
};

export type DeviceInput = {
  /** The method to detect barcodes on this device */
  barcodeDetectionMethod?: InputMaybe<BarcodeDetectionMethod>;
  cloudshelfId?: InputMaybe<Scalars['GlobalId']['input']>;
  /** The display name of the device */
  displayName?: InputMaybe<Scalars['String']['input']>;
  /** The visibility type of the device */
  engineType?: InputMaybe<EngineType>;
  /** Use this field to provide either a Cloudshelf gid, or your own external gid. If the external gid already exists, the existing record will be updated. If the external gid does not exist, a new record will be created. */
  id?: InputMaybe<Scalars['GlobalId']['input']>;
  locationId?: InputMaybe<Scalars['GlobalId']['input']>;
  /** The registration code of the device */
  registrationCode?: InputMaybe<Scalars['String']['input']>;
  /** The display name of the device */
  screenSizeInInches?: InputMaybe<Scalars['Int']['input']>;
  /** An array of variables of the device */
  variables?: InputMaybe<Array<KeyValuePairInput>>;
  /** The visibility type of the device */
  visibilityType?: InputMaybe<VisibilityType>;
};

export type DevicePageInfo = {
  __typename?: 'DevicePageInfo';
  /** The cursor for the last node in the page */
  endCursor?: Maybe<Scalars['String']['output']>;
  /** Whether or not there is a another page of data */
  hasNextPage: Scalars['Boolean']['output'];
  /** Whether or not there is a previous page of data */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** The cursor for the first node in the page */
  startCursor?: Maybe<Scalars['String']['output']>;
};

export type DevicePaginatedPayload = {
  __typename?: 'DevicePaginatedPayload';
  edges?: Maybe<Array<DeviceEdge>>;
  pageInfo?: Maybe<DevicePageInfo>;
  /** The total number of items available */
  totalCount: Scalars['Int']['output'];
};

export type DeviceUpsertPayload = {
  __typename?: 'DeviceUpsertPayload';
  /** An array of Devices that were created or updated */
  devices: Array<Device>;
  /** An array of errors that occurred during the upsert operation */
  userErrors: Array<UserError>;
};

export type DeviceUptimeRecord = {
  __typename?: 'DeviceUptimeRecord';
  count: Scalars['Int']['output'];
  /** The date and time this entity was created. */
  createdAt: Scalars['UTCDateTime']['output'];
  device: Device;
  /** A unique internal GlobalId for this entity. */
  id: Scalars['GlobalId']['output'];
  owningOrganisation: Organisation;
  /** The date and time this entity was last updated. */
  updatedAt: Scalars['UTCDateTime']['output'];
};

export type DraftOrderInput = {
  /** Use this field to provide a cloudshelf gid. */
  id?: InputMaybe<Scalars['GlobalId']['input']>;
  /** An array of lines that make up this order */
  lines?: InputMaybe<Array<OrderLineInput>>;
  /** The GlobalID of the session this order was created on */
  sessionId?: InputMaybe<Scalars['GlobalId']['input']>;
  /** Use this field to provide a third party id to this order */
  thirdPartyId?: InputMaybe<Scalars['String']['input']>;
};

/** The eCommerce platform the organisation has connected to Cloudshelf */
export enum ECommercePlatform {
  /** The organisation is connected to Cloudshelf via a custom integration */
  Custom = 'CUSTOM',
  /** The organisation is connected to Cloudshelf via the Salesforce B2C Cartridge */
  SalesforceB2C = 'SALESFORCE_B2C',
  /** The organisation is connected to Cloudshelf via the Cloudshelf Shopify app */
  Shopify = 'SHOPIFY',
  /** A internal value for when the eCommerce platform is unknown */
  Unknown = 'UNKNOWN'
}

export type EngineImageWithVariantInfo = {
  __typename?: 'EngineImageWithVariantInfo';
  preferred: Scalars['Boolean']['output'];
  url: Scalars['String']['output'];
  variantId?: Maybe<Scalars['GlobalId']['output']>;
};

export enum EngineOrientation {
  Horizontal = 'HORIZONTAL',
  Portrait = 'PORTRAIT',
  Square = 'SQUARE'
}

export type EngineProductWithAdditionalInfo = {
  __typename?: 'EngineProductWithAdditionalInfo';
  availableForSale: Scalars['Boolean']['output'];
  categoryHandles: Array<Scalars['String']['output']>;
  categoryIds: Array<Scalars['String']['output']>;
  categoryOrderByHandles: Array<CategoryOrder>;
  descriptionHtml: Scalars['String']['output'];
  eCommercePlatformProvidedId?: Maybe<Scalars['GlobalId']['output']>;
  handle: Scalars['String']['output'];
  id: Scalars['GlobalId']['output'];
  images: Array<EngineImageWithVariantInfo>;
  metadata: Array<Metadata>;
  remoteUpdatedAt: Scalars['String']['output'];
  tags: Array<Scalars['String']['output']>;
  title: Scalars['String']['output'];
  type: Scalars['String']['output'];
  variants: Array<EngineVariant>;
  vendor: Scalars['String']['output'];
};

export type EngineProductWithAdditionalInfoEdge = {
  __typename?: 'EngineProductWithAdditionalInfoEdge';
  /** The cursor for provided node to be used in pagination */
  cursor?: Maybe<Scalars['String']['output']>;
  /** The EngineProductWithAdditionalInfo entity */
  node?: Maybe<EngineProductWithAdditionalInfo>;
};

export type EngineProductWithAdditionalInfoPageInfo = {
  __typename?: 'EngineProductWithAdditionalInfoPageInfo';
  /** The cursor for the last node in the page */
  endCursor?: Maybe<Scalars['String']['output']>;
  /** Whether or not there is a another page of data */
  hasNextPage: Scalars['Boolean']['output'];
  /** Whether or not there is a previous page of data */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** The cursor for the first node in the page */
  startCursor?: Maybe<Scalars['String']['output']>;
};

export type EngineProductWithAdditionalInfoPayload = {
  __typename?: 'EngineProductWithAdditionalInfoPayload';
  edges?: Maybe<Array<EngineProductWithAdditionalInfoEdge>>;
  pageInfo?: Maybe<EngineProductWithAdditionalInfoPageInfo>;
  /** The total number of items available */
  totalCount: Scalars['Int']['output'];
};

export enum EngineStatus {
  Live = 'LIVE',
  NoCloudshelf = 'NO_CLOUDSHELF',
  Offline = 'OFFLINE',
  Updating = 'UPDATING'
}

export enum EngineType {
  DisplayOnly = 'DISPLAY_ONLY',
  Hybrid = 'HYBRID',
  Interactive = 'INTERACTIVE'
}

export type EngineVariant = {
  __typename?: 'EngineVariant';
  availableForSale: Scalars['Boolean']['output'];
  barcode: Scalars['String']['output'];
  currentlyNotInStock: Scalars['Boolean']['output'];
  displayName: Scalars['String']['output'];
  eCommercePlatformProvidedId?: Maybe<Scalars['GlobalId']['output']>;
  hasSalePrice?: Maybe<Scalars['Boolean']['output']>;
  id?: Maybe<Scalars['GlobalId']['output']>;
  options: Array<KeyValuePair>;
  originalPrice: Scalars['Float']['output'];
  position?: Maybe<Scalars['Float']['output']>;
  price: Scalars['Float']['output'];
  sellableOnlineQuantity: Scalars['Float']['output'];
  sku: Scalars['String']['output'];
};

export type Filter = {
  __typename?: 'Filter';
  attributeValues: Array<AttributeValue>;
  /** The date and time this entity was created. */
  createdAt: Scalars['UTCDateTime']['output'];
  displayName?: Maybe<Scalars['String']['output']>;
  ecommProviderFieldName: Scalars['String']['output'];
  expandedByDefault: Scalars['Boolean']['output'];
  hiddenAttributeValues: Array<Scalars['String']['output']>;
  /** A unique internal GlobalId for this entity. */
  id: Scalars['GlobalId']['output'];
  isHidden: Scalars['Boolean']['output'];
  isMergedChild: Scalars['Boolean']['output'];
  mergedInFilters: Array<MergedInFilter>;
  metafieldKey?: Maybe<Scalars['String']['output']>;
  options?: Maybe<FilterOptions>;
  /** A unique internal GlobalId for this entity. */
  parentId?: Maybe<Scalars['GlobalId']['output']>;
  priority: Scalars['Int']['output'];
  type: FilterType;
  /** The date and time this entity was last updated. */
  updatedAt: Scalars['UTCDateTime']['output'];
  valueOverrides: Array<AttributeValueOverride>;
};

export enum FilterExtractionStatus {
  Extracted = 'EXTRACTED',
  Pending = 'PENDING',
  Unknown = 'UNKNOWN'
}

export type FilterInput = {
  attributeValues: Array<AttributeValueInput>;
  displayName?: InputMaybe<Scalars['String']['input']>;
  ecommProviderFieldName: Scalars['String']['input'];
  expandedByDefault: Scalars['Boolean']['input'];
  hiddenAttributeValues: Array<Scalars['String']['input']>;
  /** Use this field to provide either a Cloudshelf gid, or your own external gid. If the external gid already exists, the existing record will be updated. If the external gid does not exist, a new record will be created. */
  id?: InputMaybe<Scalars['GlobalId']['input']>;
  isHidden: Scalars['Boolean']['input'];
  isMergedChild: Scalars['Boolean']['input'];
  mergedInFilters: Array<MergedInFilterInput>;
  metafieldKey?: InputMaybe<Scalars['String']['input']>;
  options?: InputMaybe<FilterOptionsInput>;
  parentId?: InputMaybe<Scalars['GlobalId']['input']>;
  priority: Scalars['Int']['input'];
  type: FilterType;
  valueOverrides: Array<AttributeValueOverrideInput>;
};

export type FilterOptions = {
  __typename?: 'FilterOptions';
  baseShoesizeUnit?: Maybe<Scalars['String']['output']>;
  capitalisationStyle?: Maybe<CapitalisationStyle>;
  orderType: FilterOrderType;
  swatches?: Maybe<Array<Swatch>>;
};

export type FilterOptionsInput = {
  baseShoesizeUnit?: InputMaybe<Scalars['String']['input']>;
  capitalisationStyle?: InputMaybe<CapitalisationStyle>;
  orderType: FilterOrderType;
  swatches?: InputMaybe<Array<SwatchInput>>;
};

export enum FilterOrderType {
  Alphabetical = 'ALPHABETICAL',
  Ascending = 'ASCENDING',
  Chromatic = 'CHROMATIC',
  Custom = 'CUSTOM',
  Descending = 'DESCENDING'
}

export enum FilterType {
  Basic = 'BASIC',
  CategoryHandle = 'CATEGORY_HANDLE',
  CategoryId = 'CATEGORY_ID',
  Colour = 'COLOUR',
  Material = 'MATERIAL',
  Metadata = 'METADATA',
  Price = 'PRICE',
  ProductHandle = 'PRODUCT_HANDLE',
  ProductTitle = 'PRODUCT_TITLE',
  ProductType = 'PRODUCT_TYPE',
  Promotions = 'PROMOTIONS',
  Size = 'SIZE',
  SortOrder = 'SORT_ORDER',
  StockLevel = 'STOCK_LEVEL',
  Tag = 'TAG',
  Vendor = 'VENDOR'
}

export type FulfilmentDetailsPrinterBlock = {
  __typename?: 'FulfilmentDetailsPrinterBlock';
  id: Scalars['GlobalId']['output'];
  position: Scalars['Int']['output'];
  printerBlockDiscriminator: Scalars['String']['output'];
};

export type HandoffPayload = {
  __typename?: 'HandoffPayload';
  productHandle: Scalars['String']['output'];
  productOptionId: Scalars['Float']['output'];
};

/** The anchor point for the images in the theme. This is used to determine how the images are cropped when they don't match the aspect ratio of the container. */
export enum ImageAnchor {
  /** Anchor the images at the bottom */
  Bottom = 'BOTTOM',
  /** Anchor the images at the center */
  Center = 'CENTER',
  /** Anchor the images at the left */
  Left = 'LEFT',
  /** No anchor point. */
  None = 'NONE',
  /** Anchor the images at the right */
  Right = 'RIGHT',
  /** Anchor the images at the top */
  Top = 'TOP'
}

export enum ImageOrientation {
  Landscape = 'Landscape',
  Portrait = 'Portrait',
  Square = 'Square'
}

export enum ImageQuality {
  Q2K = 'Q2K',
  Q4K = 'Q4K',
  Q8K = 'Q8K',
  Q540 = 'Q540',
  Q720 = 'Q720',
  Q1080 = 'Q1080',
  QLow = 'QLow'
}

export type IncludablePdpBlock = {
  __typename?: 'IncludablePDPBlock';
  metadataKey?: Maybe<Scalars['String']['output']>;
  productDataType?: Maybe<PdpProductDataType>;
  type: PdpBlockType;
};

export type IngestionStatsPayload = {
  __typename?: 'IngestionStatsPayload';
  imageCount: Scalars['Int']['output'];
  productCount: Scalars['Int']['output'];
  productGroupCount: Scalars['Int']['output'];
  productGroupWithValidProductCount: Scalars['Int']['output'];
  validProductCount: Scalars['Int']['output'];
  variantCount: Scalars['Int']['output'];
};

export type InstallInformation = {
  __typename?: 'InstallInformation';
  hasCloudshelf: Scalars['Boolean']['output'];
  hasLocations: Scalars['Boolean']['output'];
  hasProductGroups: Scalars['Boolean']['output'];
  hasProducts: Scalars['Boolean']['output'];
  hasTheme: Scalars['Boolean']['output'];
};

/** A key-value pair used to store additional data which can be accessed via a known key. */
export type KeyValuePair = {
  __typename?: 'KeyValuePair';
  /** The key for the value */
  key: Scalars['String']['output'];
  /** The value for the key, this can be any string value. Usually either plain string or a stringified JSON object. */
  value: Scalars['String']['output'];
};

export type KeyValuePairInput = {
  key: Scalars['String']['input'];
  value: Scalars['String']['input'];
};

export enum KnownPlugin {
  AdditionalConfiguration = 'ADDITIONAL_CONFIGURATION',
  BarcodeReader = 'BARCODE_READER',
  BookThatApp = 'BOOK_THAT_APP',
  SalesforceBasket = 'SALESFORCE_BASKET',
  ThirdPartyWeglot = 'THIRD_PARTY_WEGLOT'
}

export type KnownVersion = {
  __typename?: 'KnownVersion';
  /** A unique internal GlobalId for this entity. */
  id: Scalars['GlobalId']['output'];
  versionString: Scalars['String']['output'];
  versionType: VersionType;
};

export type LabelRule = {
  __typename?: 'LabelRule';
  backgroundColour: Scalars['String']['output'];
  checkType: LabelRuleCheckType;
  comparisonValue: Scalars['String']['output'];
  displayType: LabelRuleDisplayType;
  foregroundColour: Scalars['String']['output'];
  id: Scalars['String']['output'];
  metadataKey: Scalars['String']['output'];
  name: Scalars['String']['output'];
  ruleType: LabelRuleType;
  tagValue: Scalars['String']['output'];
  text: Scalars['String']['output'];
};

/** Defines the type of check for label rules */
export enum LabelRuleCheckType {
  /** Check if the label is equal to a specified value */
  Equal = 'EQUAL',
  /** Check if the label exists */
  Exists = 'EXISTS',
  /** Check if the label is not equal to a specified value */
  NotEqual = 'NOT_EQUAL',
  /** Check if the label does not exist */
  NotExists = 'NOT_EXISTS'
}

/** Defines the type of display for label rules */
export enum LabelRuleDisplayType {
  /** Calculate and display percent discount */
  CalculatePercentDiscount = 'CALCULATE_PERCENT_DISCOUNT',
  /** Calculate and display price discount */
  CalculatePriceDiscount = 'CALCULATE_PRICE_DISCOUNT',
  /** Display as text */
  Text = 'TEXT'
}

export type LabelRuleInput = {
  backgroundColour: Scalars['String']['input'];
  checkType: LabelRuleCheckType;
  comparisonValue?: Scalars['String']['input'];
  displayType: LabelRuleDisplayType;
  foregroundColour: Scalars['String']['input'];
  id: Scalars['String']['input'];
  metadataKey?: Scalars['String']['input'];
  name: Scalars['String']['input'];
  ruleType: LabelRuleType;
  tagValue?: Scalars['String']['input'];
  text?: Scalars['String']['input'];
};

/** Selects the type of label rule */
export enum LabelRuleType {
  /** Check if the product is discounted */
  Discounted = 'DISCOUNTED',
  /** Check against a products metadata */
  Metadata = 'METADATA',
  /** Check against a product tag */
  Tag = 'TAG'
}

/** This object represents a physical location, usually a store or a warehouse. */
export type Location = {
  __typename?: 'Location';
  /** The address of the location. */
  address: Scalars['String']['output'];
  /** The country code of the country of where the location is based. */
  countryCode: CountryCode;
  /** The date and time this entity was created. */
  createdAt: Scalars['UTCDateTime']['output'];
  /** An array of devices which are located at this location. */
  devices: Array<Device>;
  /** The name of the location. */
  displayName: Scalars['String']['output'];
  /** A unique internal GlobalId for this entity. */
  id: Scalars['GlobalId']['output'];
  /** Additional data about this entity. */
  metadata: Array<Metadata>;
  /** The organisation which owns this entity. */
  owningOrganisation: Organisation;
  /** An externally provided GlobalId */
  platformProvidedId?: Maybe<Scalars['GlobalId']['output']>;
  salesAssistants: Array<SalesAssistant>;
  /** The date and time this entity was last updated. */
  updatedAt: Scalars['UTCDateTime']['output'];
};

export type LocationDeletePayload = {
  __typename?: 'LocationDeletePayload';
  /** An array of Locations that were deleted */
  locations: Array<Location>;
  /** An array of errors that occurred during the delete operation */
  userErrors: Array<UserError>;
};

export type LocationDetailsPrinterBlock = {
  __typename?: 'LocationDetailsPrinterBlock';
  id: Scalars['GlobalId']['output'];
  position: Scalars['Int']['output'];
  printerBlockDiscriminator: Scalars['String']['output'];
};

export type LocationEdge = {
  __typename?: 'LocationEdge';
  /** The cursor for provided node to be used in pagination */
  cursor?: Maybe<Scalars['String']['output']>;
  /** The Location entity */
  node?: Maybe<Location>;
};

/** This object represents a physical location, usually a store or a warehouse. */
export type LocationInput = {
  /** The full address of the location */
  address?: InputMaybe<Scalars['String']['input']>;
  /** The country code of the location is based */
  countryCode?: InputMaybe<CountryCode>;
  /** The display name of the location */
  displayName?: InputMaybe<Scalars['String']['input']>;
  /** Use this field to provide either a Cloudshelf gid, or your own external gid. If the external gid already exists, the existing record will be updated. If the external gid does not exist, a new record will be created. */
  id?: InputMaybe<Scalars['GlobalId']['input']>;
  /** An array of metadata to attach to the location */
  metadata?: InputMaybe<Array<MetadataInput>>;
};

export type LocationPageInfo = {
  __typename?: 'LocationPageInfo';
  /** The cursor for the last node in the page */
  endCursor?: Maybe<Scalars['String']['output']>;
  /** Whether or not there is a another page of data */
  hasNextPage: Scalars['Boolean']['output'];
  /** Whether or not there is a previous page of data */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** The cursor for the first node in the page */
  startCursor?: Maybe<Scalars['String']['output']>;
};

export type LocationPaginatedPayload = {
  __typename?: 'LocationPaginatedPayload';
  edges?: Maybe<Array<LocationEdge>>;
  pageInfo?: Maybe<LocationPageInfo>;
  /** The total number of items available */
  totalCount: Scalars['Int']['output'];
};

export type LocationUpsertPayload = {
  __typename?: 'LocationUpsertPayload';
  /** An array of Locations that were created or updated */
  locations: Array<Location>;
  /** An array of errors that occurred during the upsert operation */
  userErrors: Array<UserError>;
};

export type MergedInFilter = {
  __typename?: 'MergedInFilter';
  displayName: Scalars['String']['output'];
  id: Scalars['GlobalId']['output'];
};

export type MergedInFilterInput = {
  displayName: Scalars['String']['input'];
  id: Scalars['GlobalId']['input'];
};

/** This object represents a piece of additional metadata. */
export type Metadata = {
  __typename?: 'Metadata';
  /** The date and time this entity was created. */
  createdAt: Scalars['UTCDateTime']['output'];
  /** The value for the key, this can be any string value. Usually either plain string or a stringified JSON object. */
  data: Scalars['String']['output'];
  /** A unique internal GlobalId for this entity. */
  id: Scalars['GlobalId']['output'];
  /** The key for the value */
  key: Scalars['String']['output'];
  /** The location which this metadata is linked too. */
  location?: Maybe<Location>;
  /** The organisation which owns this entity. */
  owningOrganisation: Organisation;
  /** An externally provided GlobalId */
  platformProvidedId?: Maybe<Scalars['GlobalId']['output']>;
  /** The product which this metadata is linked too. */
  product?: Maybe<Product>;
  /** The product group which this metadata is linked too. */
  productGroup?: Maybe<ProductGroup>;
  /** The product variant which this metadata is linked too. */
  productVariant?: Maybe<ProductVariant>;
  /** The date and time this entity was last updated. */
  updatedAt: Scalars['UTCDateTime']['output'];
  /** The user which this metadata is linked too. */
  user?: Maybe<User>;
};

/** This object represents a piece of additional metadata. */
export type MetadataInput = {
  data: Scalars['String']['input'];
  /** Use this field to provide either a Cloudshelf gid, or your own external gid. If the external gid already exists, the existing record will be updated. If the external gid does not exist, a new record will be created. */
  id?: InputMaybe<Scalars['GlobalId']['input']>;
  key: Scalars['String']['input'];
};

/** This object represents an image with additional metadata */
export type Metaimage = {
  __typename?: 'Metaimage';
  /** A boolean value that represents if the image was accessible last time it was checked. */
  available: Scalars['Boolean']['output'];
  /** The date and time this entity was created. */
  createdAt: Scalars['UTCDateTime']['output'];
  /** The height of the image in pixels. */
  height?: Maybe<Scalars['Int']['output']>;
  /** A unique internal GlobalId for this entity. */
  id: Scalars['GlobalId']['output'];
  /** The orientation of the image */
  orientation?: Maybe<ImageOrientation>;
  /** The URL of the image */
  originalUrl: Scalars['String']['output'];
  /** The organisation which owns this entity. */
  owningOrganisation: Organisation;
  /** A boolean value that represents if the image is a preferred image for the entity it is linked too. The Cloudshelf Engine will always try to use a preferred image over a non-preferred image. */
  preferredImage: Scalars['Boolean']['output'];
  productGroup?: Maybe<ProductGroup>;
  /** The product variant which this metaimage is linked too. */
  productVariant?: Maybe<ProductVariant>;
  /** The quality of the image */
  quality?: Maybe<ImageQuality>;
  /** The date and time this entity was last updated. */
  updatedAt: Scalars['UTCDateTime']['output'];
  /** The URL of the image */
  url: Scalars['String']['output'];
  /** The width of the image in pixels. */
  width?: Maybe<Scalars['Int']['output']>;
};

/** This object represents an image */
export type MetaimageInput = {
  preferredImage: Scalars['Boolean']['input'];
  url: Scalars['String']['input'];
};

export type MobileHandoff = {
  __typename?: 'MobileHandoff';
  cloudshelf: Cloudshelf;
  /** The date and time this entity was created. */
  createdAt: Scalars['UTCDateTime']['output'];
  /** A unique internal GlobalId for this entity. */
  id: Scalars['GlobalId']['output'];
  isCanceled: Scalars['Boolean']['output'];
  isScanned: Scalars['Boolean']['output'];
  productOptionId: Scalars['Float']['output'];
  shopifyProductHandle: Scalars['String']['output'];
  /** The date and time this entity was last updated. */
  updatedAt: Scalars['UTCDateTime']['output'];
  uploadedImageUrl?: Maybe<Scalars['String']['output']>;
};

export type Mutation = {
  __typename?: 'Mutation';
  abortPaymentRequest: PaymentGenericPayload;
  /** Adds the given list of products to the product group, if they are not already part of the product group */
  addProductsToProductGroup: Scalars['Boolean']['output'];
  cancelHandoff: MobileHandoff;
  createMobileHandoff: MobileHandoff;
  createPaidOrder: CreatePaidOrderPayload;
  createTrackedURL: TrackedUrlPayload;
  createUserAndOrganisationForCustomIntegration: CustomIntegrationFullSignupResultPayload;
  /** Allows deletion of checkout flows */
  deleteCheckoutFlows: CheckoutFlowDeletePayload;
  /** Allows deletion of Cloudshelves */
  deleteCloudshelves: CloudshelfDeletePayload;
  /** Allows deletion of Devices */
  deleteDevices: DeviceDeletePayload;
  /** Allows deletion of locations */
  deleteLocations: LocationDeletePayload;
  /** Deletes a plugin */
  deletePlugin: Scalars['Boolean']['output'];
  /** Allows deletion of product groups */
  deleteProductGroups: ProductGroupDeletePayload;
  /** Allows the deletion of Products */
  deleteProducts: ProductDeletePayload;
  /** Allows the deletion of sales assistants */
  deleteSalesAssistants: SalesAssistantDeletePayload;
  /** Allows the deletion of Themes */
  deleteThemes: ThemeDeletePayload;
  duplicateCloudshelves: CloudshelfDuplicatePayload;
  duplicateThemes: ThemeDuplicatePayload;
  editSubscription: SubscriptionRecord;
  endSession: Session;
  /** Allows the user to provide a file with known product variants to keep, any other product groups already in their organisation will be deleted. (with the exception of the all products group) */
  keepKnownProductGroupsViaFile: ProductGroupDeletionPayload;
  /** Allows the user to provide a file with known products to keep, any other products already in their organisation will be deleted */
  keepKnownProductsViaFile: ProductDeletionPayload;
  /** Allows the user to provide a file with known variants to keep, any other variants already in their organisation will be deleted */
  keepKnownVariantsViaFile: ProductVariantDeletionPayload;
  /** Allows the current user leave an Organisation. */
  leaveOrganisation: Scalars['Boolean']['output'];
  markInstallComplete: Scalars['Boolean']['output'];
  markShopifyOrganisationUninstallStarted: Scalars['Boolean']['output'];
  newSession: Session;
  /** Register a webhook for a given subject. The supplied URL will be called with a POST request when the subject is triggered. */
  registerWebhook: WebhookRegisterPayload;
  /** Removes the given products from the product group, if they are currently part of it */
  removeProductsFromProductGroup: Scalars['Boolean']['output'];
  reportCatalogStats: Scalars['Boolean']['output'];
  reportDeviceOnline: Scalars['Boolean']['output'];
  requestShopifySubscriptionCheck: Scalars['Boolean']['output'];
  revokeAccessRight: Scalars['Boolean']['output'];
  /** This is an internal function. This allows Cloudshelf staff to run internal tools */
  runInternalTool: Scalars['String']['output'];
  saveSurveyAnswers: Scalars['Boolean']['output'];
  /** Sets the users currently active organisation (actingAs), which is used to decide which organisations data is accessed in other queries. */
  selectCurrentOrganisationAccess: Scalars['Boolean']['output'];
  setActingAs: Scalars['Boolean']['output'];
  setActiveVersion: Scalars['Boolean']['output'];
  setHandoffImageUrl: MobileHandoff;
  /** Allows settings of an variables */
  setVariables: Scalars['Boolean']['output'];
  startPaymentRequest: PaymentGenericPayload;
  subscribe: Scalars['String']['output'];
  toggleInMaintenanceMode: Scalars['Boolean']['output'];
  /** Unregister a webhook for a given subject. If an array of ids is supplied, only the webhooks corresponding to the supplied ids will be unregistered, if they exists. If no array is supplied, all webhooks for the given subject will be unregistered. */
  unregisterWebhooks: WebhookRegisterPayload;
  unsubscribe: Scalars['Boolean']['output'];
  updateCustomCSSRules: Scalars['Boolean']['output'];
  /** Allows updating basic user information */
  updateMyUser: User;
  /** Sets the products in the product group to the given list of products */
  updateProductsInProductGroup: Scalars['Boolean']['output'];
  updateSalesAssistantRules: Scalars['Boolean']['output'];
  updateSession: Session;
  /** Allows upserting of checkout flows */
  upsertCheckoutFlows: CheckoutFlowUpsertPayload;
  /** Allows upserting of Cloudshelves */
  upsertCloudshelves: CloudshelfUpsertPayload;
  /** Allows upserting of Devices */
  upsertDevices: DeviceUpsertPayload;
  /** Allows upserting of Draft Order entities */
  upsertDraftOrders: OrderUpsertPayload;
  /** Allows upserting of locations */
  upsertLocations: LocationUpsertPayload;
  /** Allows upserting of Order entities */
  upsertOrders: OrderUpsertPayload;
  /** Allows upserting of an organisation */
  upsertOrganisation: OrganisationUpsertPayload;
  /** Create or updates a plugin, overriding any previous settings */
  upsertPlugin: Plugin;
  /** Allows upserting of product groups */
  upsertProductGroups: ProductGroupUpsertPayload;
  upsertProductVariants: ProductVariantUpsertPayload;
  /** Allows upserting of Products */
  upsertProducts: ProductUpsertPayload;
  /** Allows upserting of sales assistants */
  upsertSalesAssistants: SalesAssistantUpsertPayload;
  upsertShopifyOrganisation: OrganisationUpsertPayload;
  /** Allows upserting of Themes */
  upsertTheme: ThemeUpsertPayload;
  /** Allows upserting of user access to the current organisation */
  upsertUser: UserUpsertPayload;
};


export type MutationAbortPaymentRequestArgs = {
  attemptId: Scalars['String']['input'];
  sessionId: Scalars['GlobalId']['input'];
  token: Scalars['String']['input'];
};


export type MutationAddProductsToProductGroupArgs = {
  productGroupId: Scalars['GlobalId']['input'];
  productIds: Array<Scalars['GlobalId']['input']>;
};


export type MutationCancelHandoffArgs = {
  id: Scalars['GlobalId']['input'];
};


export type MutationCreateMobileHandoffArgs = {
  cloudshelfId: Scalars['GlobalId']['input'];
  productHandle: Scalars['String']['input'];
  productOptionId: Scalars['Int']['input'];
};


export type MutationCreatePaidOrderArgs = {
  input: CreatePaidOrderInput;
};


export type MutationCreateTrackedUrlArgs = {
  cloudshelfId: Scalars['GlobalId']['input'];
  sessionId?: InputMaybe<Scalars['GlobalId']['input']>;
  urlToTrack: Scalars['String']['input'];
};


export type MutationCreateUserAndOrganisationForCustomIntegrationArgs = {
  eCommercePlatform?: InputMaybe<ECommercePlatform>;
  email: Scalars['String']['input'];
  firstName: Scalars['String']['input'];
  lastName: Scalars['String']['input'];
  orgDomain: Scalars['String']['input'];
  orgName: Scalars['String']['input'];
  password: Scalars['String']['input'];
};


export type MutationDeleteCheckoutFlowsArgs = {
  ids: Array<Scalars['GlobalId']['input']>;
};


export type MutationDeleteCloudshelvesArgs = {
  ids: Array<Scalars['GlobalId']['input']>;
};


export type MutationDeleteDevicesArgs = {
  ids: Array<Scalars['GlobalId']['input']>;
};


export type MutationDeleteLocationsArgs = {
  ids: Array<Scalars['GlobalId']['input']>;
};


export type MutationDeletePluginArgs = {
  id: Scalars['GlobalId']['input'];
};


export type MutationDeleteProductGroupsArgs = {
  ids: Array<Scalars['GlobalId']['input']>;
};


export type MutationDeleteProductsArgs = {
  ids: Array<Scalars['GlobalId']['input']>;
};


export type MutationDeleteSalesAssistantsArgs = {
  ids: Array<Scalars['GlobalId']['input']>;
};


export type MutationDeleteThemesArgs = {
  ids: Array<Scalars['GlobalId']['input']>;
};


export type MutationDuplicateCloudshelvesArgs = {
  ids: Array<Scalars['GlobalId']['input']>;
};


export type MutationDuplicateThemesArgs = {
  ids: Array<Scalars['GlobalId']['input']>;
};


export type MutationEditSubscriptionArgs = {
  features: SubscriptionFeaturesInput;
};


export type MutationEndSessionArgs = {
  id: Scalars['GlobalId']['input'];
  interactions: Scalars['Int']['input'];
};


export type MutationKeepKnownProductGroupsViaFileArgs = {
  fileUrl: Scalars['String']['input'];
};


export type MutationKeepKnownProductsViaFileArgs = {
  fileUrl: Scalars['String']['input'];
};


export type MutationKeepKnownVariantsViaFileArgs = {
  fileUrl: Scalars['String']['input'];
};


export type MutationLeaveOrganisationArgs = {
  accessRightId: Scalars['GlobalId']['input'];
};


export type MutationMarkShopifyOrganisationUninstallStartedArgs = {
  hmac: Scalars['String']['input'];
  input: ShopifyStoreUninstallInput;
  nonce: Scalars['String']['input'];
};


export type MutationNewSessionArgs = {
  deviceId: Scalars['GlobalId']['input'];
  latitude?: InputMaybe<Scalars['Latitude']['input']>;
  longitude?: InputMaybe<Scalars['Longitude']['input']>;
  salesAssistantId?: InputMaybe<Scalars['GlobalId']['input']>;
};


export type MutationRegisterWebhookArgs = {
  inputs: Array<WebhookRegisterInput>;
};


export type MutationRemoveProductsFromProductGroupArgs = {
  productGroupId: Scalars['GlobalId']['input'];
  productIds: Array<Scalars['GlobalId']['input']>;
};


export type MutationReportCatalogStatsArgs = {
  knownNumberOfImages?: InputMaybe<Scalars['Int']['input']>;
  knownNumberOfProductGroups?: InputMaybe<Scalars['Int']['input']>;
  knownNumberOfProductVariants?: InputMaybe<Scalars['Int']['input']>;
  knownNumberOfProducts?: InputMaybe<Scalars['Int']['input']>;
  retailerClosed?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationReportDeviceOnlineArgs = {
  engineVersion: Scalars['String']['input'];
  id: Scalars['GlobalId']['input'];
  screenHeight: Scalars['Int']['input'];
  screenWidth: Scalars['Int']['input'];
  userAgent: Scalars['String']['input'];
};


export type MutationRequestShopifySubscriptionCheckArgs = {
  shopifyGid: Scalars['String']['input'];
};


export type MutationRevokeAccessRightArgs = {
  accessRightId: Scalars['GlobalId']['input'];
};


export type MutationRunInternalToolArgs = {
  optionalData1?: InputMaybe<Scalars['String']['input']>;
  toolType: Scalars['String']['input'];
};


export type MutationSaveSurveyAnswersArgs = {
  answers: Scalars['String']['input'];
};


export type MutationSelectCurrentOrganisationAccessArgs = {
  id?: InputMaybe<Scalars['GlobalId']['input']>;
};


export type MutationSetActingAsArgs = {
  id: Scalars['GlobalId']['input'];
};


export type MutationSetActiveVersionArgs = {
  key: Scalars['String']['input'];
  type: VersionType;
  versionString: Scalars['String']['input'];
};


export type MutationSetHandoffImageUrlArgs = {
  id: Scalars['GlobalId']['input'];
  imageUrl: Scalars['String']['input'];
};


export type MutationSetVariablesArgs = {
  variables: Array<KeyValuePairInput>;
};


export type MutationStartPaymentRequestArgs = {
  amount: Scalars['Int']['input'];
  attemptId: Scalars['String']['input'];
  organisationId: Scalars['GlobalId']['input'];
  sessionId: Scalars['GlobalId']['input'];
  token: Scalars['String']['input'];
};


export type MutationSubscribeArgs = {
  features: SubscriptionFeaturesInput;
};


export type MutationUnregisterWebhooksArgs = {
  inputs: Array<WebhookUnregisterInput>;
};


export type MutationUpdateCustomCssRulesArgs = {
  input: CustomCssInput;
};


export type MutationUpdateMyUserArgs = {
  input: UserInput;
};


export type MutationUpdateProductsInProductGroupArgs = {
  productGroupId: Scalars['GlobalId']['input'];
  productIds: Array<Scalars['GlobalId']['input']>;
};


export type MutationUpdateSalesAssistantRulesArgs = {
  input: SalesAssistantRulesInput;
};


export type MutationUpdateSessionArgs = {
  addedToBasket: Scalars['Boolean']['input'];
  basketCurrencyCode: CurrencyCode;
  basketValue: Scalars['Float']['input'];
  id: Scalars['GlobalId']['input'];
  interactions: Scalars['Int']['input'];
  salesAssistantId?: InputMaybe<Scalars['GlobalId']['input']>;
};


export type MutationUpsertCheckoutFlowsArgs = {
  input: Array<CheckoutFlowInput>;
};


export type MutationUpsertCloudshelvesArgs = {
  input: Array<CloudshelfInput>;
};


export type MutationUpsertDevicesArgs = {
  input: Array<DeviceInput>;
};


export type MutationUpsertDraftOrdersArgs = {
  cloudshelfId: Scalars['GlobalId']['input'];
  input: Array<DraftOrderInput>;
};


export type MutationUpsertLocationsArgs = {
  input: Array<LocationInput>;
};


export type MutationUpsertOrdersArgs = {
  input: Array<OrderInput>;
};


export type MutationUpsertOrganisationArgs = {
  input: OrganisationInput;
};


export type MutationUpsertPluginArgs = {
  input: PluginInput;
};


export type MutationUpsertProductGroupsArgs = {
  input: Array<ProductGroupInput>;
};


export type MutationUpsertProductVariantsArgs = {
  inputs: Array<UpsertVariantsInput>;
};


export type MutationUpsertProductsArgs = {
  input: Array<ProductInput>;
};


export type MutationUpsertSalesAssistantsArgs = {
  inputs: Array<SalesAssistantInput>;
};


export type MutationUpsertShopifyOrganisationArgs = {
  hmac: Scalars['String']['input'];
  input: ShopifyStoreInput;
  nonce: Scalars['String']['input'];
};


export type MutationUpsertThemeArgs = {
  input: ThemeInput;
};


export type MutationUpsertUserArgs = {
  input: UpsertUserInput;
};

export enum NonInteractiveCollectionType {
  Cheapest = 'CHEAPEST',
  MostExpensive = 'MOST_EXPENSIVE',
  Random = 'RANDOM',
  Recent = 'RECENT'
}

export type Order = {
  __typename?: 'Order';
  /** The date and time this entity was created. */
  createdAt: Scalars['UTCDateTime']['output'];
  discountCode?: Maybe<Scalars['String']['output']>;
  /** A unique internal GlobalId for this entity. */
  id: Scalars['GlobalId']['output'];
  lines: Array<OrderLine>;
  owningOrganisation: Organisation;
  session?: Maybe<Session>;
  status: OrderStatus;
  thirdPartyId?: Maybe<Scalars['String']['output']>;
  /** The date and time this entity was last updated. */
  updatedAt: Scalars['UTCDateTime']['output'];
};

export type OrderDetailsPrinterBlock = {
  __typename?: 'OrderDetailsPrinterBlock';
  id: Scalars['GlobalId']['output'];
  position: Scalars['Int']['output'];
  printerBlockDiscriminator: Scalars['String']['output'];
};

export type OrderEdge = {
  __typename?: 'OrderEdge';
  /** The cursor for provided node to be used in pagination */
  cursor?: Maybe<Scalars['String']['output']>;
  /** The Order entity */
  node?: Maybe<Order>;
};

export type OrderInput = {
  /** The discount code that was used on this order */
  discountCode?: InputMaybe<Scalars['String']['input']>;
  /** Use this field to provide either a Cloudshelf gid, or your own external gid. If the external gid already exists, the existing record will be updated. If the external gid does not exist, a new record will be created. */
  id?: InputMaybe<Scalars['GlobalId']['input']>;
  /** An array of lines that make up this order */
  lines?: InputMaybe<Array<OrderLineInput>>;
  /** Use this field to provide a third party id to this order */
  newThirdPartyId?: InputMaybe<Scalars['String']['input']>;
  /** The GlobalID of the session this order was created in */
  sessionId?: InputMaybe<Scalars['GlobalId']['input']>;
  status?: InputMaybe<OrderStatus>;
  /** Use this field to provide a third party id to this order */
  thirdPartyId?: InputMaybe<Scalars['String']['input']>;
};

export type OrderLine = {
  __typename?: 'OrderLine';
  /** The date and time this entity was created. */
  createdAt: Scalars['UTCDateTime']['output'];
  currencyCode: CurrencyCode;
  /** A unique internal GlobalId for this entity. */
  id: Scalars['GlobalId']['output'];
  order: Order;
  platformProvidedId?: Maybe<Scalars['GlobalId']['output']>;
  platformProvidedProductId?: Maybe<Scalars['GlobalId']['output']>;
  platformProvidedProductVariantId?: Maybe<Scalars['GlobalId']['output']>;
  price: Scalars['Float']['output'];
  productId: Scalars['String']['output'];
  productName: Scalars['String']['output'];
  productVariantId: Scalars['String']['output'];
  productVariantName: Scalars['String']['output'];
  quantity: Scalars['Int']['output'];
  /** The date and time this entity was last updated. */
  updatedAt: Scalars['UTCDateTime']['output'];
};

export type OrderLineInput = {
  currencyCode: CurrencyCode;
  /** Use this field to provide either a Cloudshelf gid, or your own external gid. If the external gid already exists, the existing record will be updated. If the external gid does not exist, a new record will be created. */
  id?: InputMaybe<Scalars['GlobalId']['input']>;
  price: Scalars['Float']['input'];
  /** The GlobalID of the product this order line is for */
  productID?: InputMaybe<Scalars['GlobalId']['input']>;
  /** The GlobalID of the product variant this order line is for */
  productVariantID?: InputMaybe<Scalars['GlobalId']['input']>;
  quantity: Scalars['Int']['input'];
};

export type OrderPageInfo = {
  __typename?: 'OrderPageInfo';
  /** The cursor for the last node in the page */
  endCursor?: Maybe<Scalars['String']['output']>;
  /** Whether or not there is a another page of data */
  hasNextPage: Scalars['Boolean']['output'];
  /** Whether or not there is a previous page of data */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** The cursor for the first node in the page */
  startCursor?: Maybe<Scalars['String']['output']>;
};

export type OrderPaginatedPayload = {
  __typename?: 'OrderPaginatedPayload';
  edges?: Maybe<Array<OrderEdge>>;
  pageInfo?: Maybe<OrderPageInfo>;
  /** The total number of items available */
  totalCount: Scalars['Int']['output'];
};

export type OrderReferencePrinterBlock = {
  __typename?: 'OrderReferencePrinterBlock';
  id: Scalars['GlobalId']['output'];
  position: Scalars['Int']['output'];
  printerBlockDiscriminator: Scalars['String']['output'];
};

/** The status of the order */
export enum OrderStatus {
  /** The order is a draft basket */
  DraftBasket = 'DRAFT_BASKET',
  Paid = 'PAID',
  /** The order has been partially refunded */
  PartiallyRefunded = 'PARTIALLY_REFUNDED',
  /** The order has been placed & paid for */
  Placed = 'PLACED',
  /** The order has been fully refunded */
  Refunded = 'REFUNDED',
  /** The order has been voided */
  Voided = 'VOIDED'
}

export type OrderUpsertPayload = {
  __typename?: 'OrderUpsertPayload';
  /** An array of Orders that were created or updated */
  orders: Array<Order>;
  /** An array of errors that occurred during the upsert operation */
  userErrors: Array<UserError>;
};

/** This object represents an organisation, usually a retailer. This object owns all the other data in the system for a given organisation. */
export type Organisation = {
  __typename?: 'Organisation';
  allowCustomCSS: Scalars['Boolean']['output'];
  allowCustomCSSRetailerChanges: Scalars['Boolean']['output'];
  /** The date and time this entity was created. */
  createdAt: Scalars['UTCDateTime']['output'];
  /** Returns the latest subscription (or null if the organisation has never subscribed) */
  currentSubscription?: Maybe<SubscriptionRecord>;
  /** The uptime records which belong to this organisation. */
  deviceUptimeRecords: Array<DeviceUptimeRecord>;
  /** The devices which belong to this organisation. */
  devices: Array<Device>;
  /** The display name for the organisation. */
  displayName: Scalars['String']['output'];
  /** The domain name for the organisation. */
  domainName: Scalars['String']['output'];
  eCommercePlatform: ECommercePlatform;
  /** An array of KeyValuePairs which contain the configuration for the eCommerce platform. This is used to store any additional data required for the eCommerce platform. */
  eCommercePlatformConfiguration: Array<KeyValuePair>;
  /** The display name for the eCommerce platform, this is used for display purposes only when eCommercePlatform is custom. */
  eCommercePlatformDisplayName: Scalars['String']['output'];
  engagements: Array<Session>;
  /** A unique internal GlobalId for this entity. */
  id: Scalars['GlobalId']['output'];
  installCompleted: Scalars['Boolean']['output'];
  installInformation: InstallInformation;
  installSurveyAnswers?: Maybe<Scalars['String']['output']>;
  isClosed: Scalars['Boolean']['output'];
  /** The date and time this organisation received ingestion data */
  lastIngestionDataDate?: Maybe<Scalars['UTCDateTime']['output']>;
  lastReportedCatalogStatsForImages?: Maybe<CatalogStats>;
  lastReportedCatalogStatsForProductGroups?: Maybe<CatalogStats>;
  lastReportedCatalogStatsForProducts?: Maybe<CatalogStats>;
  lastReportedCatalogStatsForVariants?: Maybe<CatalogStats>;
  /** The locations which belong to this organisation. */
  locations: Array<Location>;
  /** The orders which belong to this organisation. */
  orders: Array<Order>;
  /** The plugin records which belong to this organisation. */
  plugins: Array<Plugin>;
  /** The product groups which belong to this organisation. */
  productGroups: Array<ProductGroup>;
  /** The product variants which belong to this organisation. */
  productVariants: Array<ProductVariant>;
  /** The products which belong to this organisation. */
  products: Array<Product>;
  salesAssistantAllocation: Scalars['Boolean']['output'];
  salesAssistantClearRule: ClearSalesAssistantRule;
  salesAssistantNameRule: SalesAssistantNameRule;
  uninstallStarted: Scalars['Boolean']['output'];
  /** The date and time this entity was last updated. */
  updatedAt: Scalars['UTCDateTime']['output'];
  users: Array<User>;
  /** An array of KeyValuePairs which contain user provided variables to be used by Cloudshelf or Cloudshelf Extensions. */
  variables: Array<KeyValuePair>;
};


/** This object represents an organisation, usually a retailer. This object owns all the other data in the system for a given organisation. */
export type OrganisationEngagementsArgs = {
  endDate?: InputMaybe<Scalars['UTCDateTime']['input']>;
  startDate?: InputMaybe<Scalars['UTCDateTime']['input']>;
};

export type OrganisationEdge = {
  __typename?: 'OrganisationEdge';
  /** The cursor for provided node to be used in pagination */
  cursor?: Maybe<Scalars['String']['output']>;
  /** The Organisation entity */
  node?: Maybe<Organisation>;
};

export type OrganisationInput = {
  /** The display name of the organisation */
  displayName?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['GlobalId']['input'];
};

export type OrganisationPageInfo = {
  __typename?: 'OrganisationPageInfo';
  /** The cursor for the last node in the page */
  endCursor?: Maybe<Scalars['String']['output']>;
  /** Whether or not there is a another page of data */
  hasNextPage: Scalars['Boolean']['output'];
  /** Whether or not there is a previous page of data */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** The cursor for the first node in the page */
  startCursor?: Maybe<Scalars['String']['output']>;
};

export type OrganisationPaginatedPayload = {
  __typename?: 'OrganisationPaginatedPayload';
  edges?: Maybe<Array<OrganisationEdge>>;
  pageInfo?: Maybe<OrganisationPageInfo>;
  /** The total number of items available */
  totalCount: Scalars['Int']['output'];
};

export type OrganisationSortOptionsInput = {
  createdAt?: InputMaybe<SortOrder>;
  id?: InputMaybe<SortOrder>;
  status?: InputMaybe<SortOrder>;
  updatedAt?: InputMaybe<SortOrder>;
};

export type OrganisationUpsertPayload = {
  __typename?: 'OrganisationUpsertPayload';
  /** The Organisation that has been updated */
  organisation?: Maybe<Organisation>;
  /** An array of errors that occurred during the upsert operation */
  userErrors: Array<UserError>;
};

export type PdpBlockInput = {
  blockType: PdpBlockType;
  displayName: Scalars['String']['input'];
  id: Scalars['GlobalId']['input'];
  metadataDisplayType?: InputMaybe<PdpMetadataDisplayType>;
  metadataKey?: InputMaybe<Scalars['String']['input']>;
  position: Scalars['Int']['input'];
  productDataType?: InputMaybe<PdpProductDataType>;
  removeThemeShortcodes?: InputMaybe<Scalars['Boolean']['input']>;
  style: PdpBlockStyle;
};

export enum PdpBlockStyle {
  Collapsible = 'COLLAPSIBLE',
  Expandable = 'EXPANDABLE',
  Static = 'STATIC'
}

export enum PdpBlockType {
  Description = 'DESCRIPTION',
  Labels = 'LABELS',
  Metadata = 'METADATA',
  ProductData = 'PRODUCT_DATA',
  Spacer = 'SPACER',
  Variants = 'VARIANTS'
}

export type PdpBlockUnion = PdpDescriptionBlock | PdpLabelsBlock | PdpMetadataBlock | PdpProductDataBlock | PdpSpacerBlock | PdpVariantsBlock;

export type PdpDescriptionBlock = {
  __typename?: 'PDPDescriptionBlock';
  blockType: PdpBlockType;
  displayName: Scalars['String']['output'];
  id: Scalars['GlobalId']['output'];
  position: Scalars['Float']['output'];
  removeThemeShortcodes?: Maybe<Scalars['Boolean']['output']>;
  style: PdpBlockStyle;
};

export type PdpLabelsBlock = {
  __typename?: 'PDPLabelsBlock';
  blockType: PdpBlockType;
  displayName: Scalars['String']['output'];
  id: Scalars['GlobalId']['output'];
  position: Scalars['Float']['output'];
  style: PdpBlockStyle;
};

export type PdpMetadataBlock = {
  __typename?: 'PDPMetadataBlock';
  blockType: PdpBlockType;
  displayName: Scalars['String']['output'];
  displayType?: Maybe<PdpMetadataDisplayType>;
  id: Scalars['GlobalId']['output'];
  key?: Maybe<Scalars['String']['output']>;
  position: Scalars['Float']['output'];
  style: PdpBlockStyle;
};

export enum PdpMetadataDisplayType {
  Image = 'IMAGE',
  Text = 'TEXT',
  YoutubeVideo = 'YOUTUBE_VIDEO'
}

export type PdpProductDataBlock = {
  __typename?: 'PDPProductDataBlock';
  blockType: PdpBlockType;
  displayName: Scalars['String']['output'];
  id: Scalars['GlobalId']['output'];
  position: Scalars['Float']['output'];
  productDataType?: Maybe<PdpProductDataType>;
  style: PdpBlockStyle;
};

export enum PdpProductDataType {
  Barcode = 'BARCODE',
  Sku = 'SKU',
  Vendor = 'VENDOR'
}

export type PdpSpacerBlock = {
  __typename?: 'PDPSpacerBlock';
  blockType: PdpBlockType;
  displayName: Scalars['String']['output'];
  id: Scalars['GlobalId']['output'];
  position: Scalars['Float']['output'];
  style: PdpBlockStyle;
};

export type PdpVariantsBlock = {
  __typename?: 'PDPVariantsBlock';
  blockType: PdpBlockType;
  displayName: Scalars['String']['output'];
  id: Scalars['GlobalId']['output'];
  position: Scalars['Float']['output'];
  style: PdpBlockStyle;
};

export type PaymentDetailsPrinterBlock = {
  __typename?: 'PaymentDetailsPrinterBlock';
  id: Scalars['GlobalId']['output'];
  position: Scalars['Int']['output'];
  printerBlockDiscriminator: Scalars['String']['output'];
};

export type PaymentGenericPayload = {
  __typename?: 'PaymentGenericPayload';
  authorizationId?: Maybe<Scalars['String']['output']>;
  cancelled?: Maybe<Scalars['Boolean']['output']>;
  cardType?: Maybe<Scalars['String']['output']>;
  extra?: Maybe<Scalars['String']['output']>;
  maskedCardNumber?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  pending?: Maybe<Scalars['Boolean']['output']>;
  success?: Maybe<Scalars['Boolean']['output']>;
  tid?: Maybe<Scalars['String']['output']>;
  transactionId?: Maybe<Scalars['String']['output']>;
  verificationMethod?: Maybe<Scalars['String']['output']>;
};

export type PaymentProvidersUnion = VivawalletPaymentProvider;

export type PaymentTokenPayload = {
  __typename?: 'PaymentTokenPayload';
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
  token?: Maybe<Scalars['String']['output']>;
};

/** This object represents a plugin for a given organisation */
export type Plugin = {
  __typename?: 'Plugin';
  /** The date and time this entity was created. */
  createdAt: Scalars['UTCDateTime']['output'];
  /** A unique internal GlobalId for this entity. */
  id: Scalars['GlobalId']['output'];
  /** The organisation which owns this entity. */
  owningOrganisation: Organisation;
  type: KnownPlugin;
  /** The date and time this entity was last updated. */
  updatedAt: Scalars['UTCDateTime']['output'];
  /** An array of KeyValuePairs which contain user provided variables to be used by this plugin. */
  variables: Array<KeyValuePair>;
};

export type PluginEdge = {
  __typename?: 'PluginEdge';
  /** The cursor for provided node to be used in pagination */
  cursor?: Maybe<Scalars['String']['output']>;
  /** The Plugin entity */
  node?: Maybe<Plugin>;
};

export type PluginInput = {
  id?: InputMaybe<Scalars['GlobalId']['input']>;
  type: KnownPlugin;
  /** An array of variables of the product variant */
  variables?: InputMaybe<Array<KeyValuePairInput>>;
};

export type PluginPageInfo = {
  __typename?: 'PluginPageInfo';
  /** The cursor for the last node in the page */
  endCursor?: Maybe<Scalars['String']['output']>;
  /** Whether or not there is a another page of data */
  hasNextPage: Scalars['Boolean']['output'];
  /** Whether or not there is a previous page of data */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** The cursor for the first node in the page */
  startCursor?: Maybe<Scalars['String']['output']>;
};

export type PluginPaginatedPayload = {
  __typename?: 'PluginPaginatedPayload';
  edges?: Maybe<Array<PluginEdge>>;
  pageInfo?: Maybe<PluginPageInfo>;
  /** The total number of items available */
  totalCount: Scalars['Int']['output'];
};

export enum PowerTileBackgroundType {
  Gradient = 'GRADIENT',
  Image = 'IMAGE',
  SolidColour = 'SOLID_COLOUR',
  Transparent = 'TRANSPARENT'
}

export type PrecutPrinterBlock = {
  __typename?: 'PrecutPrinterBlock';
  id: Scalars['GlobalId']['output'];
  position: Scalars['Int']['output'];
  printerBlockDiscriminator: Scalars['String']['output'];
};

export type PrinterBlockInput = {
  alignment?: InputMaybe<Alignment>;
  id: Scalars['GlobalId']['input'];
  position: Scalars['Int']['input'];
  printerBlockDiscriminator: Scalars['String']['input'];
  size?: InputMaybe<Size>;
};

export type PrinterBlocksUnion = CloudshelfDetailsPrinterBlock | DeviceDetailsPrinterBlock | FulfilmentDetailsPrinterBlock | LocationDetailsPrinterBlock | OrderDetailsPrinterBlock | OrderReferencePrinterBlock | PaymentDetailsPrinterBlock | PrecutPrinterBlock | SalesAssistantDetailsPrinterBlock | SpacerPrinterBlock | TextPrinterBlock | TimestampPrinterBlock;

/** This object represents a product, which will always contain at least one variant */
export type Product = {
  __typename?: 'Product';
  /** The date and time this entity was created. */
  createdAt: Scalars['UTCDateTime']['output'];
  /** The description of the product */
  description?: Maybe<Scalars['String']['output']>;
  /** The name of the product. */
  displayName: Scalars['String']['output'];
  /** The handle of the product, which is the original display name in all lower case, and with all non-alphanumeric characters removed and spaces replaced with hyphens. */
  handle: Scalars['String']['output'];
  /** A unique internal GlobalId for this entity. */
  id: Scalars['GlobalId']['output'];
  /** Additional data about this entity. */
  metadata: Array<Metadata>;
  /** The organisation which owns this entity. */
  owningOrganisation: Organisation;
  /** An externally provided GlobalId */
  platformProvidedId?: Maybe<Scalars['GlobalId']['output']>;
  /** An array of product groups which this product is a member of */
  productGroups: Array<ProductGroup>;
  /** The type of the product. */
  productType?: Maybe<Scalars['String']['output']>;
  /** An array of product variants which are associated with this product */
  productVariants: Array<ProductVariant>;
  /** The date and time this entity was updated on its eCommerceProvider (this can be null if the retailer chooses not to provider it) */
  remoteUpdatedAt?: Maybe<Scalars['UTCDateTime']['output']>;
  /** An array of tags which are associated with the product */
  tags: Array<Scalars['String']['output']>;
  /** The date and time this entity was last updated. */
  updatedAt: Scalars['UTCDateTime']['output'];
  /** The vendor of the product. Usually used for the Brand Name */
  vendor?: Maybe<Scalars['String']['output']>;
};

export type ProductDeletePayload = {
  __typename?: 'ProductDeletePayload';
  /** An array of Products that were deleted */
  products: Array<Product>;
  /** An array of errors that occurred during the delete operation */
  userErrors: Array<UserError>;
};

export type ProductDeletionPayload = {
  __typename?: 'ProductDeletionPayload';
  /** The number of products that were removed from the organisation */
  count: Scalars['Int']['output'];
  /** An array of errors that occurred during the delete operation */
  userErrors: Array<UserError>;
};

export type ProductEdge = {
  __typename?: 'ProductEdge';
  /** The cursor for provided node to be used in pagination */
  cursor?: Maybe<Scalars['String']['output']>;
  /** The Product entity */
  node?: Maybe<Product>;
};

/** A group of products, usually a category or a brand. */
export type ProductGroup = {
  __typename?: 'ProductGroup';
  /** The content associated with this product group. */
  content?: Maybe<Array<CloudshelfContent>>;
  /** The date and time this entity was created. */
  createdAt: Scalars['UTCDateTime']['output'];
  /** The name of the product group. */
  displayName: Scalars['String']['output'];
  featuredImage?: Maybe<Metaimage>;
  /** The handle of the product, which is the original display name in all lower case, and with all non-alphanumeric characters removed and spaces replaced with hyphens. */
  handle: Scalars['String']['output'];
  /** A unique internal GlobalId for this entity. */
  id: Scalars['GlobalId']['output'];
  /** A boolean value indicating whether this is the internal all product group contains all products in the organisation. */
  isAllProductGroup: Scalars['Boolean']['output'];
  /** Additional data about this entity. */
  metadata: Array<Metadata>;
  /** The organisation which owns this entity. */
  owningOrganisation: Organisation;
  /** An externally provided GlobalId */
  platformProvidedId?: Maybe<Scalars['GlobalId']['output']>;
  productCount: Scalars['Int']['output'];
  /** The products which are members of this product group */
  products: Array<Product>;
  /** The date and time this entity was last updated. */
  updatedAt: Scalars['UTCDateTime']['output'];
};

export type ProductGroupDeletePayload = {
  __typename?: 'ProductGroupDeletePayload';
  /** An array of ProductGroups that were deleted */
  productGroups: Array<ProductGroup>;
  /** An array of errors that occurred during the delete operation */
  userErrors: Array<UserError>;
};

export type ProductGroupDeletionPayload = {
  __typename?: 'ProductGroupDeletionPayload';
  /** The number of product groups that were removed from the organisation */
  count: Scalars['Int']['output'];
  /** An array of errors that occurred during the delete operation */
  userErrors: Array<UserError>;
};

export type ProductGroupEdge = {
  __typename?: 'ProductGroupEdge';
  /** The cursor for provided node to be used in pagination */
  cursor?: Maybe<Scalars['String']['output']>;
  /** The ProductGroup entity */
  node?: Maybe<ProductGroup>;
};

export type ProductGroupInput = {
  /** The display name of the product group */
  displayName?: InputMaybe<Scalars['String']['input']>;
  /** The featured image of the product group */
  featuredImage?: InputMaybe<MetaimageInput>;
  /** Use this field to provide either a Cloudshelf gid, or your own external gid. If the external gid already exists, the existing record will be updated. If the external gid does not exist, a new record will be created. */
  id?: InputMaybe<Scalars['GlobalId']['input']>;
  /** An array of metadata to attach to the product group */
  metadata?: InputMaybe<Array<MetadataInput>>;
};

export type ProductGroupPageInfo = {
  __typename?: 'ProductGroupPageInfo';
  /** The cursor for the last node in the page */
  endCursor?: Maybe<Scalars['String']['output']>;
  /** Whether or not there is a another page of data */
  hasNextPage: Scalars['Boolean']['output'];
  /** Whether or not there is a previous page of data */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** The cursor for the first node in the page */
  startCursor?: Maybe<Scalars['String']['output']>;
};

export type ProductGroupPaginatedPayload = {
  __typename?: 'ProductGroupPaginatedPayload';
  edges?: Maybe<Array<ProductGroupEdge>>;
  pageInfo?: Maybe<ProductGroupPageInfo>;
  /** The total number of items available */
  totalCount: Scalars['Int']['output'];
};

export type ProductGroupUpsertPayload = {
  __typename?: 'ProductGroupUpsertPayload';
  /** An array of ProductGroups that were created or updated */
  productGroups: Array<ProductGroup>;
  /** An array of errors that occurred during the upsert operation */
  userErrors: Array<UserError>;
};

export type ProductInput = {
  /** The description of the product */
  description?: InputMaybe<Scalars['String']['input']>;
  /** The display name of the product */
  displayName?: InputMaybe<Scalars['String']['input']>;
  /** The display name of the product */
  handle?: InputMaybe<Scalars['String']['input']>;
  /** Use this field to provide either a Cloudshelf gid, or your own external gid. If the external gid already exists, the existing record will be updated. If the external gid does not exist, a new record will be created. */
  id?: InputMaybe<Scalars['GlobalId']['input']>;
  /** An array of metadata to attach to the product group */
  metadata?: InputMaybe<Array<MetadataInput>>;
  /** The type of the product */
  productType?: InputMaybe<Scalars['String']['input']>;
  /** The date and time this entity was updated on its eCommerceProvider (this can be null if the retailer chooses not to provider it) */
  remoteUpdatedAt?: InputMaybe<Scalars['UTCDateTime']['input']>;
  /** An array of tags to attach to the product */
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  /** The vendor of the product */
  vendor?: InputMaybe<Scalars['String']['input']>;
};

export type ProductPageInfo = {
  __typename?: 'ProductPageInfo';
  /** The cursor for the last node in the page */
  endCursor?: Maybe<Scalars['String']['output']>;
  /** Whether or not there is a another page of data */
  hasNextPage: Scalars['Boolean']['output'];
  /** Whether or not there is a previous page of data */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** The cursor for the first node in the page */
  startCursor?: Maybe<Scalars['String']['output']>;
};

export type ProductPaginatedPayload = {
  __typename?: 'ProductPaginatedPayload';
  edges?: Maybe<Array<ProductEdge>>;
  pageInfo?: Maybe<ProductPageInfo>;
  /** The total number of items available */
  totalCount: Scalars['Int']['output'];
};

export type ProductUpsertPayload = {
  __typename?: 'ProductUpsertPayload';
  /** An array of Products that were created or updated */
  products: Array<Product>;
  /** An array of errors that occurred during the upsert operation */
  userErrors: Array<UserError>;
};

/** This object represents a variant of a product. */
export type ProductVariant = {
  __typename?: 'ProductVariant';
  attributes: Array<KeyValuePair>;
  /** Whether this variant is available to purchase. */
  availableToPurchase: Scalars['Boolean']['output'];
  barcode?: Maybe<Scalars['String']['output']>;
  /** The date and time this entity was created. */
  createdAt: Scalars['UTCDateTime']['output'];
  currentPrice: Scalars['Float']['output'];
  /** The name of the variant */
  displayName?: Maybe<Scalars['String']['output']>;
  /** A unique internal GlobalId for this entity. */
  id: Scalars['GlobalId']['output'];
  /** Whether this variant is in stock. */
  isInStock: Scalars['Boolean']['output'];
  /** Additional data about this entity. */
  metadata: Array<Metadata>;
  /** Images related this variant */
  metaimages: Array<Metaimage>;
  originalPrice: Scalars['Float']['output'];
  /** The organisation which owns this entity. */
  owningOrganisation: Organisation;
  /** An externally provided GlobalId */
  platformProvidedId?: Maybe<Scalars['GlobalId']['output']>;
  /** The position of the product variant in the list of variants */
  position?: Maybe<Scalars['Int']['output']>;
  /** The product which this variant belongs to. */
  product: Product;
  sku?: Maybe<Scalars['String']['output']>;
  /** The date and time this entity was last updated. */
  updatedAt: Scalars['UTCDateTime']['output'];
};

export type ProductVariantDeletionPayload = {
  __typename?: 'ProductVariantDeletionPayload';
  /** The number of variants that were removed from the organisation */
  count: Scalars['Int']['output'];
  /** An array of errors that occurred during the delete operation */
  userErrors: Array<UserError>;
};

export type ProductVariantInput = {
  /** An array of attributes of the product variant */
  attributes?: InputMaybe<Array<KeyValuePairInput>>;
  /** Whether the product variant is available to purchase */
  availableToPurchase?: InputMaybe<Scalars['Boolean']['input']>;
  /** The barcode of the product variant */
  barcode?: InputMaybe<Scalars['String']['input']>;
  /** The current price of the product variant */
  currentPrice?: InputMaybe<Scalars['Float']['input']>;
  /** The display name of the product variant */
  displayName?: InputMaybe<Scalars['String']['input']>;
  /** Use this field to provide either a Cloudshelf gid, or your own external gid. If the external gid already exists, the existing record will be updated. If the external gid does not exist, a new record will be created. */
  id?: InputMaybe<Scalars['GlobalId']['input']>;
  /** Whether the product variant is in stock */
  isInStock?: InputMaybe<Scalars['Boolean']['input']>;
  /** An array of metadata to attach to the product variant */
  metadata?: InputMaybe<Array<MetadataInput>>;
  /** An array of images related to the product variant */
  metaimages?: InputMaybe<Array<MetaimageInput>>;
  /** The original price of the product. If the product variant is not discounted, this should equal the original price */
  originalPrice?: InputMaybe<Scalars['Float']['input']>;
  /** The position of the product variant in the list of variants */
  position?: InputMaybe<Scalars['Int']['input']>;
  /** The SKU of the product variant */
  sku?: InputMaybe<Scalars['String']['input']>;
};

export type ProductVariantUpsertPayload = {
  __typename?: 'ProductVariantUpsertPayload';
  /** An array of ProductVariants that were created or updated */
  productVariants: Array<ProductVariant>;
  /** An array of errors that occurred during the upsert operation */
  userErrors: Array<UserError>;
};

export type PublicDevicePayload = {
  __typename?: 'PublicDevicePayload';
  /** A unique internal GlobalId for this entity. */
  id: Scalars['GlobalId']['output'];
  ownerId?: Maybe<Scalars['GlobalId']['output']>;
  ownerName?: Maybe<Scalars['String']['output']>;
  /** An externally provided GlobalId */
  platformProvidedId?: Maybe<Scalars['GlobalId']['output']>;
  registered: Scalars['Boolean']['output'];
  registrationCode: Scalars['String']['output'];
};

/** The destination of the QR code checkout. */
export enum QrCheckoutDestination {
  /** When a user scans a QR, they will be taken to the Salesforce B2C checkout flow. */
  SalesforceB2C = 'SALESFORCE_B2C',
  /** When a user scans a QR, they will be taken to the shopify payments page. */
  Shopify = 'SHOPIFY',
  /** When a user scans a QR, they will have the basket transferred to a third party service. */
  TransferBasket = 'TRANSFER_BASKET',
  /** This is an internal value and should not be used. */
  Unknown = 'UNKNOWN'
}

export type Query = {
  __typename?: 'Query';
  allIngestionStats: Array<IngestionStatsPayload>;
  /** Returns an array of PDP Blocks that are available to add to the PDP */
  availablePDPBlocks: Array<IncludablePdpBlock>;
  /** Returns a boolean value which indicates if the organisation can register a new device */
  canRegisterDevice: Scalars['Boolean']['output'];
  /** Returns a checkout flow entity */
  checkoutFlow?: Maybe<CheckoutFlowOptions>;
  /** Returns a paginated array of checkout flows */
  checkoutFlows: CheckoutFlowPaginatedPayload;
  /** Returns a Cloudshelf entity */
  cloudshelf?: Maybe<Cloudshelf>;
  cloudshelfEnginePayload: CloudshelfEnginePayload;
  /** Returns a paginated array of Cloudshelves */
  cloudshelves: CloudshelfPaginatedPayload;
  createPaymentAttempt: PaymentGenericPayload;
  /** An internal function for getting a Cloudshelf Authentication Token. */
  customToken?: Maybe<Scalars['String']['output']>;
  /** Returns a Device entity */
  device?: Maybe<Device>;
  deviceEngagementRecords: Array<DeviceEngagementRecord>;
  /** Returns a paginated array of Devices. */
  devices: DevicePaginatedPayload;
  engineProducts: EngineProductWithAdditionalInfoPayload;
  /** Returns a Filter entity */
  filter?: Maybe<Filter>;
  getMobileHandoff?: Maybe<MobileHandoff>;
  getPaymentRequest: PaymentGenericPayload;
  getPaymentToken: PaymentTokenPayload;
  getPresignedCustomisationUrl: Scalars['String']['output'];
  getVersionByType: KnownVersion;
  /** Returns all filters that can possibly be included in the Cloudshelf */
  includeableFilters: Array<CloudshelfIncludableFilter>;
  ingestionStats: IngestionStatsPayload;
  isInMaintenanceMode: Scalars['Boolean']['output'];
  isTrackedURLScanned: Scalars['Boolean']['output'];
  /** Returns a location entity */
  location?: Maybe<Location>;
  /** Returns a paginated array of locations */
  locations: LocationPaginatedPayload;
  /** Returns the currently authenticated user. */
  me: User;
  metadataKeys: Array<Scalars['String']['output']>;
  /** Returns an Order entity. */
  order?: Maybe<Order>;
  /** Returns a paginated array of Order entities */
  orders: OrderPaginatedPayload;
  /** Returns an Organisation entity */
  organisation?: Maybe<Organisation>;
  /** Returns if the install has been completed for an organisation */
  organisationInstallComplete?: Maybe<Scalars['Boolean']['output']>;
  /** Returns a paginated array of user access rights for the current organisation */
  organisationUsers: UserForOrganisationPaginatedPayload;
  /** Returns a paginated array of organisations */
  organisations: OrganisationPaginatedPayload;
  /** Returns a paginated array of plugins */
  plugins: PluginPaginatedPayload;
  /** Returns a Product entity. */
  product?: Maybe<Product>;
  /** Returns a Product Group */
  productGroup?: Maybe<ProductGroup>;
  /** Returns a paginated array of product groups */
  productGroups: ProductGroupPaginatedPayload;
  /** Returns a paginated array of Product entities. */
  products: ProductPaginatedPayload;
  /** Returns public information about a device */
  publicDevice?: Maybe<PublicDevicePayload>;
  /** Returns a sales assistant entity */
  salesAssistant?: Maybe<SalesAssistant>;
  /** Returns a paginated array of Sales Assistants */
  salesAssistants: SalesAssistantPaginatedPayload;
  sessions: Array<Session>;
  /** Returns a subscription entity */
  subscription?: Maybe<SubscriptionRecord>;
  /** This is an internal function. This function is not intended to be included in the final release. Only exists due to CS-1273 */
  subscriptionCurrentOrg?: Maybe<SubscriptionRecord>;
  /** Returns a list of currently available subscription plans */
  subscriptionPlans?: Maybe<Array<SubscriptionPlan>>;
  syncStats: SyncStatsPayload;
  /** Returns a theme entity */
  theme?: Maybe<Theme>;
  /** Returns a paginated array of Themes */
  themes: ThemePaginatedPayload;
  uptimeRecords: Array<DeviceUptimeRecord>;
  usageStatsSessions: UsageSessionsResponse;
  /** Returns a User entity */
  user: User;
  /** Query a webhook by ID */
  webhook?: Maybe<Webhook>;
  /** Query the list of registered webhooks */
  webhooks: WebhookPaginatedPayload;
};


export type QueryAvailablePdpBlocksArgs = {
  id: Scalars['GlobalId']['input'];
};


export type QueryCheckoutFlowArgs = {
  id: Scalars['GlobalId']['input'];
};


export type QueryCheckoutFlowsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  sortBy?: InputMaybe<SortOptionsInput>;
  textSearch?: InputMaybe<Scalars['String']['input']>;
};


export type QueryCloudshelfArgs = {
  id: Scalars['GlobalId']['input'];
};


export type QueryCloudshelfEnginePayloadArgs = {
  engineVersion?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['GlobalId']['input'];
  payloadType: CloudshelfPayloadType;
  reportPageLoad?: InputMaybe<Scalars['Boolean']['input']>;
};


export type QueryCloudshelvesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  sortBy?: InputMaybe<SortOptionsInput>;
  textSearch?: InputMaybe<Scalars['String']['input']>;
};


export type QueryCreatePaymentAttemptArgs = {
  organisationId: Scalars['GlobalId']['input'];
  sessionId: Scalars['GlobalId']['input'];
};


export type QueryCustomTokenArgs = {
  domain: Scalars['String']['input'];
};


export type QueryDeviceArgs = {
  id: Scalars['GlobalId']['input'];
};


export type QueryDeviceEngagementRecordsArgs = {
  endDate: Scalars['UTCDateTime']['input'];
  locationIds?: InputMaybe<Array<Scalars['GlobalId']['input']>>;
  startDate: Scalars['UTCDateTime']['input'];
};


export type QueryDevicesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  sortBy?: InputMaybe<SortOptionsInput>;
  textSearch?: InputMaybe<Scalars['String']['input']>;
};


export type QueryEngineProductsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  cloudshelfId: Scalars['GlobalId']['input'];
  explicitProductHandle?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  includeMetafieldKeys?: InputMaybe<Array<Scalars['String']['input']>>;
  includeMetafieldPartialKeys?: InputMaybe<Array<Scalars['String']['input']>>;
  isDisplayMode: Scalars['Boolean']['input'];
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryFilterArgs = {
  id: Scalars['GlobalId']['input'];
};


export type QueryGetMobileHandoffArgs = {
  id: Scalars['GlobalId']['input'];
};


export type QueryGetPaymentRequestArgs = {
  attemptId: Scalars['String']['input'];
  sessionId: Scalars['GlobalId']['input'];
  token: Scalars['String']['input'];
};


export type QueryGetPaymentTokenArgs = {
  organisationId: Scalars['GlobalId']['input'];
  sessionId: Scalars['GlobalId']['input'];
};


export type QueryGetPresignedCustomisationUrlArgs = {
  type: Scalars['String']['input'];
};


export type QueryGetVersionByTypeArgs = {
  type: VersionType;
};


export type QueryIncludeableFiltersArgs = {
  cloudshelfId: Scalars['GlobalId']['input'];
};


export type QueryIngestionStatsArgs = {
  id?: InputMaybe<Scalars['GlobalId']['input']>;
};


export type QueryIsTrackedUrlScannedArgs = {
  id: Scalars['GlobalId']['input'];
};


export type QueryLocationArgs = {
  id: Scalars['GlobalId']['input'];
};


export type QueryLocationsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  sortBy?: InputMaybe<SortOptionsInput>;
  textSearch?: InputMaybe<Scalars['String']['input']>;
};


export type QueryOrderArgs = {
  id: Scalars['GlobalId']['input'];
};


export type QueryOrdersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  sortBy?: InputMaybe<SortOptionsInput>;
};


export type QueryOrganisationArgs = {
  id: Scalars['GlobalId']['input'];
};


export type QueryOrganisationInstallCompleteArgs = {
  domain: Scalars['String']['input'];
};


export type QueryOrganisationUsersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  sortBy?: InputMaybe<SortOptionsInput>;
  textSearch?: InputMaybe<Scalars['String']['input']>;
};


export type QueryOrganisationsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  sortBy?: InputMaybe<OrganisationSortOptionsInput>;
  textSearch?: InputMaybe<Scalars['String']['input']>;
};


export type QueryPluginsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  sortBy?: InputMaybe<SortOptionsInput>;
  textSearch?: InputMaybe<Scalars['String']['input']>;
};


export type QueryProductArgs = {
  id: Scalars['GlobalId']['input'];
};


export type QueryProductGroupArgs = {
  id: Scalars['GlobalId']['input'];
};


export type QueryProductGroupsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  sortBy?: InputMaybe<SortOptionsInput>;
};


export type QueryProductsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  sortBy?: InputMaybe<SortOptionsInput>;
  textSearch?: InputMaybe<Scalars['String']['input']>;
};


export type QueryPublicDeviceArgs = {
  id: Scalars['GlobalId']['input'];
};


export type QuerySalesAssistantArgs = {
  id: Scalars['GlobalId']['input'];
};


export type QuerySalesAssistantsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  sortBy?: InputMaybe<SortOptionsInput>;
  textSearch?: InputMaybe<Scalars['String']['input']>;
};


export type QuerySessionsArgs = {
  cloudshelfId?: InputMaybe<Scalars['GlobalId']['input']>;
  deviceId?: InputMaybe<Scalars['GlobalId']['input']>;
  endDate?: InputMaybe<Scalars['UTCDateTime']['input']>;
  includeIncomplete?: InputMaybe<Scalars['Boolean']['input']>;
  includeInternal?: InputMaybe<Scalars['Boolean']['input']>;
  organisationIds?: InputMaybe<Array<Scalars['GlobalId']['input']>>;
  startDate?: InputMaybe<Scalars['UTCDateTime']['input']>;
};


export type QuerySubscriptionArgs = {
  id: Scalars['GlobalId']['input'];
};


export type QuerySyncStatsArgs = {
  id?: InputMaybe<Scalars['GlobalId']['input']>;
};


export type QueryThemeArgs = {
  id: Scalars['GlobalId']['input'];
};


export type QueryThemesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  sortBy?: InputMaybe<SortOptionsInput>;
  textSearch?: InputMaybe<Scalars['String']['input']>;
};


export type QueryUptimeRecordsArgs = {
  endDate: Scalars['UTCDateTime']['input'];
  locationIds?: InputMaybe<Array<Scalars['GlobalId']['input']>>;
  startDate: Scalars['UTCDateTime']['input'];
};


export type QueryUsageStatsSessionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  input: UsageSessionsInput;
  last?: InputMaybe<Scalars['Int']['input']>;
  sortBy?: InputMaybe<SortOptionsInput>;
};


export type QueryUserArgs = {
  id: Scalars['GlobalId']['input'];
};


export type QueryWebhookArgs = {
  id: Scalars['GlobalId']['input'];
};


export type QueryWebhooksArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  sortBy?: InputMaybe<SortOptionsInput>;
};

/** This object represents a sales assistant */
export type SalesAssistant = {
  __typename?: 'SalesAssistant';
  /** The date and time this entity was created. */
  createdAt: Scalars['UTCDateTime']['output'];
  displayName: Scalars['String']['output'];
  /** A unique internal GlobalId for this entity. */
  id: Scalars['GlobalId']['output'];
  locations: Array<Location>;
  /** The organisation that owns this sales assistant. */
  owningOrganisation: Organisation;
  /** An externally provided GlobalId */
  platformProvidedId?: Maybe<Scalars['GlobalId']['output']>;
  thirdPartyReference: Scalars['String']['output'];
  /** The date and time this entity was last updated. */
  updatedAt: Scalars['UTCDateTime']['output'];
};

export type SalesAssistantDeletePayload = {
  __typename?: 'SalesAssistantDeletePayload';
  /** An array of Sales Assistants that were deleted */
  salesAssistants: Array<SalesAssistant>;
  /** An array of errors that occurred during the delete operation */
  userErrors: Array<UserError>;
};

export type SalesAssistantDetailsPrinterBlock = {
  __typename?: 'SalesAssistantDetailsPrinterBlock';
  id: Scalars['GlobalId']['output'];
  position: Scalars['Int']['output'];
  printerBlockDiscriminator: Scalars['String']['output'];
};

export type SalesAssistantEdge = {
  __typename?: 'SalesAssistantEdge';
  /** The cursor for provided node to be used in pagination */
  cursor?: Maybe<Scalars['String']['output']>;
  /** The SalesAssistant entity */
  node?: Maybe<SalesAssistant>;
};

export type SalesAssistantInput = {
  displayName: Scalars['String']['input'];
  /** Use this field to provide either a Cloudshelf gid, or your own external gid. If the external gid already exists, the existing record will be updated. If the external gid does not exist, a new record will be created. */
  id?: InputMaybe<Scalars['GlobalId']['input']>;
  locationIds: Array<Scalars['GlobalId']['input']>;
  thirdPartyReference: Scalars['String']['input'];
};

export enum SalesAssistantNameRule {
  FullName = 'FULL_NAME',
  Reference = 'REFERENCE'
}

export type SalesAssistantPageInfo = {
  __typename?: 'SalesAssistantPageInfo';
  /** The cursor for the last node in the page */
  endCursor?: Maybe<Scalars['String']['output']>;
  /** Whether or not there is a another page of data */
  hasNextPage: Scalars['Boolean']['output'];
  /** Whether or not there is a previous page of data */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** The cursor for the first node in the page */
  startCursor?: Maybe<Scalars['String']['output']>;
};

export type SalesAssistantPaginatedPayload = {
  __typename?: 'SalesAssistantPaginatedPayload';
  edges?: Maybe<Array<SalesAssistantEdge>>;
  pageInfo?: Maybe<SalesAssistantPageInfo>;
  /** The total number of items available */
  totalCount: Scalars['Int']['output'];
};

export type SalesAssistantRulesInput = {
  salesAssistantAllocation?: InputMaybe<Scalars['Boolean']['input']>;
  salesAssistantClearRule?: InputMaybe<ClearSalesAssistantRule>;
  salesAssistantNameRule?: InputMaybe<SalesAssistantNameRule>;
};

export type SalesAssistantUpsertPayload = {
  __typename?: 'SalesAssistantUpsertPayload';
  salesAssistants: Array<SalesAssistant>;
  /** An array of errors that occurred during the upsert operation */
  userErrors: Array<UserError>;
};

/** This object represents a session that took place on a Cloudshelf */
export type Session = {
  __typename?: 'Session';
  addedAnythingToBasket: Scalars['Boolean']['output'];
  basketCurrencyCode: CurrencyCode;
  basketValue: Scalars['Float']['output'];
  cloudshelfId?: Maybe<Scalars['String']['output']>;
  cloudshelfName?: Maybe<Scalars['String']['output']>;
  /** The date and time this entity was created. */
  createdAt: Scalars['UTCDateTime']['output'];
  deviceId?: Maybe<Scalars['String']['output']>;
  deviceName?: Maybe<Scalars['String']['output']>;
  duration: Scalars['Float']['output'];
  /** The date and time that this session ended at. */
  endedAt?: Maybe<Scalars['UTCDateTime']['output']>;
  /** A unique internal GlobalId for this entity. */
  id: Scalars['GlobalId']['output'];
  /** The number of interactions that took place in this session */
  interactionCount: Scalars['Int']['output'];
  latitude?: Maybe<Scalars['Latitude']['output']>;
  locationId?: Maybe<Scalars['String']['output']>;
  locationName?: Maybe<Scalars['String']['output']>;
  longitude?: Maybe<Scalars['Longitude']['output']>;
  order?: Maybe<Order>;
  /** The organisation which owns this entity. */
  owningOrganisation: Organisation;
  paymentAttemptId?: Maybe<Scalars['String']['output']>;
  salesAssistantId?: Maybe<Scalars['String']['output']>;
  salesAssistantName?: Maybe<Scalars['String']['output']>;
  /** The static of the session */
  status: SessionStatus;
  trackedUrl?: Maybe<TrackedUrl>;
  /** The date and time this entity was last updated. */
  updatedAt: Scalars['UTCDateTime']['output'];
  visibilityType: VisibilityType;
};

export enum SessionStatus {
  Complete = 'COMPLETE',
  Invalid = 'INVALID',
  InProgress = 'IN_PROGRESS'
}

export type ShopifyStoreInput = {
  /** Shopify access token for the store */
  accessToken?: InputMaybe<Scalars['String']['input']>;
  /** The display name of the organisation */
  displayName?: InputMaybe<Scalars['String']['input']>;
  /** Domain of the shopify store */
  domain?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['GlobalId']['input']>;
  /** An array of scopes granted to the store */
  scopes?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Shopify storefront access token for the store */
  storefrontAccessToken?: InputMaybe<Scalars['String']['input']>;
};

export type ShopifyStoreUninstallInput = {
  /** Domain of the shopify store */
  domain: Scalars['String']['input'];
};

export enum Size {
  Hidden = 'HIDDEN',
  Large = 'LARGE',
  Regular = 'REGULAR',
  Small = 'SMALL'
}

export type SortOptionsInput = {
  createdAt?: InputMaybe<SortOrder>;
  id?: InputMaybe<SortOrder>;
  updatedAt?: InputMaybe<SortOrder>;
};

/** Allow ordering a query's results */
export enum SortOrder {
  /** Sort in ascending order */
  Asc = 'ASC',
  /** Sort in descending order */
  Desc = 'DESC'
}

export type SpacerPrinterBlock = {
  __typename?: 'SpacerPrinterBlock';
  id: Scalars['GlobalId']['output'];
  position: Scalars['Int']['output'];
  printerBlockDiscriminator: Scalars['String']['output'];
};

export type SubscriptionFeaturesInput = {
  accessToDisplayScheduling?: InputMaybe<Scalars['Boolean']['input']>;
  accessToImageBanners?: InputMaybe<Scalars['Boolean']['input']>;
  accessToProductCustomisation?: InputMaybe<Scalars['Boolean']['input']>;
  accessToSalesPersonAttribution?: InputMaybe<Scalars['Boolean']['input']>;
  accessToStoreAttribution?: InputMaybe<Scalars['Boolean']['input']>;
  accessToVideoBanners?: InputMaybe<Scalars['Boolean']['input']>;
  bypassEcommerceProvider?: InputMaybe<Scalars['Boolean']['input']>;
  canRemoveCloudshelfBranding?: InputMaybe<Scalars['Boolean']['input']>;
  devicesPerLocation?: InputMaybe<Scalars['Float']['input']>;
  freeLocations?: InputMaybe<Scalars['Float']['input']>;
  hubspotDealNumber?: InputMaybe<Scalars['String']['input']>;
  liveLocations: Scalars['Float']['input'];
  overridePrice?: InputMaybe<Scalars['Float']['input']>;
  planId: Scalars['GlobalId']['input'];
};

export enum SubscriptionInterval {
  Annually = 'ANNUALLY',
  Monthly = 'MONTHLY'
}

export type SubscriptionPlan = {
  __typename?: 'SubscriptionPlan';
  accessToDisplayScheduling: Scalars['Boolean']['output'];
  accessToImageBanners: Scalars['Boolean']['output'];
  accessToProductCustomisation: Scalars['Boolean']['output'];
  accessToSalesPersonAttribution: Scalars['Boolean']['output'];
  accessToStoreAttribution: Scalars['Boolean']['output'];
  accessToVideoBanners: Scalars['Boolean']['output'];
  cloudshelfBranded: Scalars['Boolean']['output'];
  /** The date and time this entity was created. */
  createdAt: Scalars['UTCDateTime']['output'];
  displayName: Scalars['String']['output'];
  displayOrder: Scalars['Int']['output'];
  englishDisplayName: Scalars['String']['output'];
  /** A unique internal GlobalId for this entity. */
  id: Scalars['GlobalId']['output'];
  information: Array<Scalars['String']['output']>;
  maxNumDevicesPerLocation: Scalars['Int']['output'];
  pricePerMonthPerLocation: Scalars['Float']['output'];
  retailerCanSelectThisPlan: Scalars['Boolean']['output'];
  /** The date and time this entity was last updated. */
  updatedAt: Scalars['UTCDateTime']['output'];
};

export type SubscriptionPlanUsage = {
  __typename?: 'SubscriptionPlanUsage';
  id: Scalars['String']['output'];
  numberOfAllocatedLocations: Scalars['Int']['output'];
  numberOfLiveDevices: Scalars['Int']['output'];
};

export type SubscriptionRecord = {
  __typename?: 'SubscriptionRecord';
  accessToDisplayScheduling: Scalars['Boolean']['output'];
  accessToImageBanners: Scalars['Boolean']['output'];
  accessToProductCustomisation: Scalars['Boolean']['output'];
  accessToSalesPersonAttribution: Scalars['Boolean']['output'];
  accessToStoreAttribution: Scalars['Boolean']['output'];
  accessToVideoBanners: Scalars['Boolean']['output'];
  amountUSD: Scalars['Float']['output'];
  billingInterval: SubscriptionInterval;
  canRemoveCloudshelfBranding: Scalars['Boolean']['output'];
  /** The date and time this entity was created. */
  createdAt: Scalars['UTCDateTime']['output'];
  devicesPerLocation: Scalars['Int']['output'];
  freeLocations: Scalars['Int']['output'];
  hubspotDealNumber?: Maybe<Scalars['String']['output']>;
  /** A unique internal GlobalId for this entity. */
  id: Scalars['GlobalId']['output'];
  liveLocations: Scalars['Int']['output'];
  owningOrganisation: Organisation;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  /** The third party ID for the subscription. For a shopify retailer, this will be the shopify subscription gid. */
  thirdPartyId?: Maybe<Scalars['String']['output']>;
  type: SubscriptionType;
  /** The date and time this entity was last updated. */
  updatedAt: Scalars['UTCDateTime']['output'];
  usage: SubscriptionPlanUsage;
};

export enum SubscriptionStatus {
  Active = 'ACTIVE',
  Expired = 'EXPIRED',
  Frozen = 'FROZEN',
  Pending = 'PENDING'
}

export enum SubscriptionType {
  Custom = 'CUSTOM',
  Plan = 'PLAN',
  Unknown = 'UNKNOWN'
}

export type Swatch = {
  __typename?: 'Swatch';
  displayName: Scalars['String']['output'];
  imageUrl: Scalars['String']['output'];
};

export type SwatchInput = {
  displayName: Scalars['String']['input'];
  imageUrl: Scalars['String']['input'];
};

export type SyncStatsPayload = {
  __typename?: 'SyncStatsPayload';
  isClosed?: Maybe<Scalars['Boolean']['output']>;
  lastIngestionDataDate?: Maybe<Scalars['UTCDateTime']['output']>;
  lastReportedCatalogStatsForImages?: Maybe<CatalogStats>;
  lastReportedCatalogStatsForProductGroups?: Maybe<CatalogStats>;
  lastReportedCatalogStatsForProducts?: Maybe<CatalogStats>;
  lastReportedCatalogStatsForVariants?: Maybe<CatalogStats>;
};

export type TextPrinterBlock = {
  __typename?: 'TextPrinterBlock';
  alignment: Alignment;
  id: Scalars['GlobalId']['output'];
  position: Scalars['Int']['output'];
  printerBlockDiscriminator: Scalars['String']['output'];
  size: Size;
  textContent: Scalars['String']['output'];
};

/** This object represents a theme, which is a collection of styles and fonts that can be applied to a Cloudshelf. */
export type Theme = {
  __typename?: 'Theme';
  attractLoopBackgroundColor: Scalars['String']['output'];
  attractLoopFontColor: Scalars['String']['output'];
  attractLoopFontSize: Size;
  bodyFont: ThemeFont;
  /** An array of Cloudshelves that use this theme. */
  cloudshelves: Array<Cloudshelf>;
  collectionGridTileModifier: Scalars['Float']['output'];
  /** The date and time this entity was created. */
  createdAt: Scalars['UTCDateTime']['output'];
  /** The custom CSS that will be loaded */
  customCSS?: Maybe<Scalars['String']['output']>;
  /** The name of the theme. */
  displayName: Scalars['String']['output'];
  dynamicProductGridIncludeHero: Scalars['Boolean']['output'];
  dynamicProductGridIncludeSquare: Scalars['Boolean']['output'];
  dynamicProductGridIncludeTall: Scalars['Boolean']['output'];
  dynamicProductGridIncludeWide: Scalars['Boolean']['output'];
  headingFont: ThemeFont;
  /** A unique internal GlobalId for this entity. */
  id: Scalars['GlobalId']['output'];
  imageAnchor: ImageAnchor;
  labelHorizontalAlignment: Alignment;
  labelRules: Array<LabelRule>;
  labelVerticalAlignment: VerticalAlignment;
  /** The cloudshelf engine will override all colours and show the logo as a white cutout. */
  logoForceWhite: Scalars['Boolean']['output'];
  logoSize: Size;
  /** The logo URL for the organisations logo */
  logoUrl?: Maybe<Scalars['String']['output']>;
  /** The colour of the main text. */
  mainTextColor: Scalars['String']['output'];
  /** The organisation that owns this theme. */
  owningOrganisation: Organisation;
  /** An externally provided GlobalId */
  platformProvidedId?: Maybe<Scalars['GlobalId']['output']>;
  /** The primary colour of the theme. */
  primaryColor: Scalars['String']['output'];
  /** The primary contrastcolour of the theme. */
  primaryContrastColor: Scalars['String']['output'];
  productGridTileModifier: Scalars['Float']['output'];
  /** The colour of the purchase button. */
  purchaseColor: Scalars['String']['output'];
  radius: ThemeRadius;
  /** A boolean value indicating whether or not the Cloudshelf branding should be removed. */
  removeCloudshelfBranding: Scalars['Boolean']['output'];
  /** The colour of the sale text (current price). */
  saleColour: Scalars['String']['output'];
  /** The colour of the sale text (original price). */
  saleOriginalColour: Scalars['String']['output'];
  subheadingFont: ThemeFont;
  tileSize: TileSize;
  /** The date and time this entity was last updated. */
  updatedAt: Scalars['UTCDateTime']['output'];
};

export type ThemeDeletePayload = {
  __typename?: 'ThemeDeletePayload';
  /** An array of Themes that were deleted */
  themes: Array<Theme>;
  /** An array of errors that occurred during the delete operation */
  userErrors: Array<UserError>;
};

export type ThemeDuplicatePayload = {
  __typename?: 'ThemeDuplicatePayload';
  /** An array of errors that occurred during the delete operation */
  userErrors: Array<UserError>;
};

export type ThemeEdge = {
  __typename?: 'ThemeEdge';
  /** The cursor for provided node to be used in pagination */
  cursor?: Maybe<Scalars['String']['output']>;
  /** The Theme entity */
  node?: Maybe<Theme>;
};

export type ThemeFont = {
  __typename?: 'ThemeFont';
  fontFamily: Scalars['String']['output'];
  fontFamilyCDN?: Maybe<Scalars['String']['output']>;
  fontWeightDisplay: Scalars['String']['output'];
  fontWeightIsCustom: Scalars['Boolean']['output'];
  fontWeightValue: Scalars['String']['output'];
  isCustomFont: Scalars['Boolean']['output'];
};

export type ThemeFontInput = {
  fontFamily?: Scalars['String']['input'];
  fontFamilyCDN?: InputMaybe<Scalars['String']['input']>;
  fontWeightDisplay: Scalars['String']['input'];
  fontWeightIsCustom: Scalars['Boolean']['input'];
  fontWeightValue: Scalars['String']['input'];
  isCustomFont?: Scalars['Boolean']['input'];
};

export type ThemeInput = {
  attractLoopBackgroundColor?: InputMaybe<Scalars['String']['input']>;
  attractLoopFontColor?: InputMaybe<Scalars['String']['input']>;
  /** Hidden will not be respected by the API */
  attractLoopFontSize?: InputMaybe<Size>;
  blocksRounded?: InputMaybe<Scalars['Boolean']['input']>;
  bodyFont?: InputMaybe<ThemeFontInput>;
  collectionGridTileModifier?: InputMaybe<Scalars['Float']['input']>;
  customCSS?: InputMaybe<Scalars['String']['input']>;
  displayName?: InputMaybe<Scalars['String']['input']>;
  dynamicProductGridIncludeHero?: InputMaybe<Scalars['Boolean']['input']>;
  dynamicProductGridIncludeSquare?: InputMaybe<Scalars['Boolean']['input']>;
  dynamicProductGridIncludeTall?: InputMaybe<Scalars['Boolean']['input']>;
  dynamicProductGridIncludeWide?: InputMaybe<Scalars['Boolean']['input']>;
  headingFont?: InputMaybe<ThemeFontInput>;
  /** Use this field to provide either a Cloudshelf gid, or your own external gid. If the external gid already exists, the existing record will be updated. If the external gid does not exist, a new record will be created. */
  id?: InputMaybe<Scalars['GlobalId']['input']>;
  imageAnchor?: InputMaybe<ImageAnchor>;
  inputsRounded?: InputMaybe<Scalars['Boolean']['input']>;
  labelHorizontalAlignment?: InputMaybe<Alignment>;
  labelRules?: InputMaybe<Array<LabelRuleInput>>;
  labelVerticalAlignment?: InputMaybe<VerticalAlignment>;
  logoForceWhite?: InputMaybe<Scalars['Boolean']['input']>;
  logoSize?: InputMaybe<Size>;
  logoUrl?: InputMaybe<Scalars['String']['input']>;
  mainTextColor?: InputMaybe<Scalars['String']['input']>;
  primaryColor?: InputMaybe<Scalars['String']['input']>;
  primaryContrastColor?: InputMaybe<Scalars['String']['input']>;
  productGridTileModifier?: InputMaybe<Scalars['Float']['input']>;
  purchaseColor?: InputMaybe<Scalars['String']['input']>;
  removeCloudshelfBranding?: InputMaybe<Scalars['Boolean']['input']>;
  saleColour?: InputMaybe<Scalars['String']['input']>;
  saleOriginalColour?: InputMaybe<Scalars['String']['input']>;
  subheadingFont?: InputMaybe<ThemeFontInput>;
  tileSize?: InputMaybe<TileSize>;
};

export type ThemePageInfo = {
  __typename?: 'ThemePageInfo';
  /** The cursor for the last node in the page */
  endCursor?: Maybe<Scalars['String']['output']>;
  /** Whether or not there is a another page of data */
  hasNextPage: Scalars['Boolean']['output'];
  /** Whether or not there is a previous page of data */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** The cursor for the first node in the page */
  startCursor?: Maybe<Scalars['String']['output']>;
};

export type ThemePaginatedPayload = {
  __typename?: 'ThemePaginatedPayload';
  edges?: Maybe<Array<ThemeEdge>>;
  pageInfo?: Maybe<ThemePageInfo>;
  /** The total number of items available */
  totalCount: Scalars['Int']['output'];
};

export type ThemeRadius = {
  __typename?: 'ThemeRadius';
  drawer: Scalars['Float']['output'];
  inputs: Scalars['Float']['output'];
  modal: Scalars['Float']['output'];
  tiles: Scalars['Float']['output'];
};

export type ThemeUpsertPayload = {
  __typename?: 'ThemeUpsertPayload';
  /** The theme that was created or updated */
  theme?: Maybe<Theme>;
  /** An array of errors that occurred during the upsert operation */
  userErrors: Array<UserError>;
};

export type ThirdPartyOrder = {
  __typename?: 'ThirdPartyOrder';
  id: Scalars['String']['output'];
  taxLines: Array<ThirdPartyTaxLine>;
};

export type ThirdPartyTaxLine = {
  __typename?: 'ThirdPartyTaxLine';
  money: Scalars['Float']['output'];
  ratePercentage: Scalars['Float']['output'];
  title: Scalars['String']['output'];
};

/** The default size your product tiles will use, hero sizes will be larger than the standard size selected here */
export enum TileSize {
  /** 2x2 */
  Hero = 'HERO',
  /** A dynamic grid */
  Mixed = 'MIXED',
  /** 1x1 */
  Square = 'SQUARE',
  /** 2x1 */
  Tall = 'TALL',
  /** 2x1 */
  Wide = 'WIDE'
}

export type TimestampPrinterBlock = {
  __typename?: 'TimestampPrinterBlock';
  id: Scalars['GlobalId']['output'];
  position: Scalars['Int']['output'];
  printerBlockDiscriminator: Scalars['String']['output'];
};

export type TrackedUrl = {
  __typename?: 'TrackedURL';
  cloudshelfId?: Maybe<Scalars['GlobalId']['output']>;
  cloudshelfName?: Maybe<Scalars['String']['output']>;
  /** The date and time this entity was created. */
  createdAt: Scalars['UTCDateTime']['output'];
  /** A unique internal GlobalId for this entity. */
  id: Scalars['GlobalId']['output'];
  session?: Maybe<Session>;
  status: TrackedUrlStatus;
  /** The date and time this entity was last updated. */
  updatedAt: Scalars['UTCDateTime']['output'];
  url: Scalars['String']['output'];
};

export type TrackedUrlPayload = {
  __typename?: 'TrackedURLPayload';
  error?: Maybe<UserError>;
  trackedUrl?: Maybe<TrackedUrlResponse>;
};

export type TrackedUrlResponse = {
  __typename?: 'TrackedURLResponse';
  id: Scalars['GlobalId']['output'];
  url: Scalars['String']['output'];
};

export enum TrackedUrlStatus {
  Opened = 'OPENED',
  Unopened = 'UNOPENED'
}

export type UpsertUserInput = {
  /** The email address of the user */
  emailAddress: Scalars['String']['input'];
  /** The first name of the user. (Only used if the email address does not already exist) */
  firstName: Scalars['String']['input'];
  hasDeletePermission: Scalars['Boolean']['input'];
  hasWritePermission: Scalars['Boolean']['input'];
  /** Use this field to provide either a Cloudshelf gid, or your own external gid. If the external gid already exists, the existing record will be updated. If the external gid does not exist, a new record will be created. */
  id?: InputMaybe<Scalars['GlobalId']['input']>;
  /** The last name of the user. (Only used if the email address does not already exist) */
  lastName: Scalars['String']['input'];
};

export type UpsertVariantsInput = {
  /** Use this field to provide either a Cloudshelf gid, or your own external gid. If the external gid already exists, the existing record will be updated. If the external gid does not exist, a new record will be created. */
  productId: Scalars['GlobalId']['input'];
  variants: Array<ProductVariantInput>;
};

export enum UsageSessionType {
  AddedToBasket = 'ADDED_TO_BASKET',
  CreatedCheckout = 'CREATED_CHECKOUT',
  Interacted = 'INTERACTED',
  Purchased = 'PURCHASED',
  SentToCheckout = 'SENT_TO_CHECKOUT'
}

export type UsageSessionsInput = {
  endDate?: InputMaybe<Scalars['UTCDateTime']['input']>;
  queryString?: InputMaybe<Scalars['String']['input']>;
  sessionTypes: Array<UsageSessionType>;
  startDate?: InputMaybe<Scalars['UTCDateTime']['input']>;
};

export type UsageSessionsResponse = {
  __typename?: 'UsageSessionsResponse';
  edges?: Maybe<Array<ComplexSessionEdge>>;
  pageInfo?: Maybe<ComplexSessionPageInfo>;
  /** The total number of items available */
  totalCount: Scalars['Int']['output'];
};

export type User = {
  __typename?: 'User';
  actingAs?: Maybe<UserOrganisationAccess>;
  /** The date and time this entity was created. */
  createdAt: Scalars['UTCDateTime']['output'];
  email: Scalars['String']['output'];
  firebaseIdentifier?: Maybe<Scalars['String']['output']>;
  firstName: Scalars['String']['output'];
  /** A unique internal GlobalId for this entity. */
  id: Scalars['GlobalId']['output'];
  lastAccess?: Maybe<Scalars['UTCDateTime']['output']>;
  lastName: Scalars['String']['output'];
  metadata: Array<Metadata>;
  /** The date and time this entity was last updated. */
  updatedAt: Scalars['UTCDateTime']['output'];
  userOrganisationAccessRights: Array<UserOrganisationAccess>;
};

export type UserError = {
  __typename?: 'UserError';
  /** An error code that can be used to programmatically identify the error */
  code: UserErrorCode;
  /** This field provides more explicit information about the error */
  message: Scalars['String']['output'];
};

/** A high level error code which is used to indicate the type of error that has occurred. For more information see the message field. */
export enum UserErrorCode {
  ActionDisallowed = 'ACTION_DISALLOWED',
  /** The data provided for the given upsert function was missing and is required for entity creation */
  EntityCreationMissingField = 'ENTITY_CREATION_MISSING_FIELD',
  /** The data provided for the given upsert function was invalid for entity creation or updating */
  EntityInvalidField = 'ENTITY_INVALID_FIELD',
  EntityInUse = 'ENTITY_IN_USE',
  EntityNotFound = 'ENTITY_NOT_FOUND',
  /** An error occurred while attempting to upload an image */
  ImageUploadError = 'IMAGE_UPLOAD_ERROR',
  InvalidArgument = 'INVALID_ARGUMENT',
  /** The file provided was invalid, or could not be accessed. */
  InvalidFile = 'INVALID_FILE',
  InvalidHmac = 'INVALID_HMAC',
  TemporaryRestriction = 'TEMPORARY_RESTRICTION',
  UnknownError = 'UNKNOWN_ERROR'
}

export type UserForOrganisation = {
  __typename?: 'UserForOrganisation';
  emailAddress: Scalars['String']['output'];
  firstName: Scalars['String']['output'];
  hasAdminPermission: Scalars['Boolean']['output'];
  hasDeletePermission: Scalars['Boolean']['output'];
  hasWritePermission: Scalars['Boolean']['output'];
  /** A unique internal for this users organisation access. */
  id: Scalars['GlobalId']['output'];
  lastName: Scalars['String']['output'];
};

export type UserForOrganisationEdge = {
  __typename?: 'UserForOrganisationEdge';
  /** The cursor for provided node to be used in pagination */
  cursor?: Maybe<Scalars['String']['output']>;
  /** The UserForOrganisation entity */
  node?: Maybe<UserForOrganisation>;
};

export type UserForOrganisationPageInfo = {
  __typename?: 'UserForOrganisationPageInfo';
  /** The cursor for the last node in the page */
  endCursor?: Maybe<Scalars['String']['output']>;
  /** Whether or not there is a another page of data */
  hasNextPage: Scalars['Boolean']['output'];
  /** Whether or not there is a previous page of data */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** The cursor for the first node in the page */
  startCursor?: Maybe<Scalars['String']['output']>;
};

export type UserForOrganisationPaginatedPayload = {
  __typename?: 'UserForOrganisationPaginatedPayload';
  edges?: Maybe<Array<UserForOrganisationEdge>>;
  pageInfo?: Maybe<UserForOrganisationPageInfo>;
  /** The total number of items available */
  totalCount: Scalars['Int']['output'];
};

export type UserInput = {
  /** The first name of the user */
  firstName?: InputMaybe<Scalars['String']['input']>;
  /** Use this field to provide either a Cloudshelf gid, or your own external gid. If the external gid already exists, the existing record will be updated. If the external gid does not exist, a new record will be created. */
  id?: InputMaybe<Scalars['GlobalId']['input']>;
  /** The last name of the user */
  lastName?: InputMaybe<Scalars['String']['input']>;
};

export type UserOrganisationAccess = {
  __typename?: 'UserOrganisationAccess';
  apiKey?: Maybe<Scalars['String']['output']>;
  /** The date and time this entity was created. */
  createdAt: Scalars['UTCDateTime']['output'];
  hasAdminAccess: Scalars['Boolean']['output'];
  hasDeleteAccess: Scalars['Boolean']['output'];
  hasWriteAccess: Scalars['Boolean']['output'];
  /** A unique internal GlobalId for this entity. */
  id: Scalars['GlobalId']['output'];
  isCloudshelfStaff: Scalars['Boolean']['output'];
  organisation: Organisation;
  /** The date and time this entity was last updated. */
  updatedAt: Scalars['UTCDateTime']['output'];
  user: User;
};

export type UserUpsertPayload = {
  __typename?: 'UserUpsertPayload';
  /** The user that has been created (or added to the organisation) */
  user?: Maybe<User>;
  /** An array of errors that occurred during the upsert operation */
  userErrors: Array<UserError>;
  /** The user organisation access that has been updated (or added to the organisation) */
  userOrganisationAccess?: Maybe<UserOrganisationAccess>;
};

export enum VersionType {
  Backend = 'BACKEND',
  Engine = 'ENGINE',
  Manager = 'MANAGER',
  Storefinder = 'STOREFINDER',
  Worker = 'WORKER'
}

/** How to vertically align the entity in the parent's space. */
export enum VerticalAlignment {
  /** Align the entity to the bottom of the parent. */
  Bottom = 'BOTTOM',
  /** Align the entity to the center of the parent. */
  Center = 'CENTER',
  /** Align the entity to the top of the parent. */
  Top = 'TOP'
}

export enum VisibilityType {
  CloudshelfInternal = 'CLOUDSHELF_INTERNAL',
  Retailer = 'RETAILER'
}

export type VivawalletPaymentProvider = {
  __typename?: 'VivawalletPaymentProvider';
  currencyCode: Scalars['String']['output'];
  displayName: Scalars['String']['output'];
  id: Scalars['GlobalId']['output'];
  paymentProviderDiscriminator: Scalars['String']['output'];
  posApiClientId: Scalars['String']['output'];
  posApiClientSecret: Scalars['String']['output'];
  useDemoMode: Scalars['Boolean']['output'];
};

export type VivawalletPaymentProviderInput = {
  currencyCode: Scalars['String']['input'];
  /** The display name of the payment provider */
  displayName?: InputMaybe<Scalars['String']['input']>;
  /** Use this field to provide either a Cloudshelf gid */
  id?: InputMaybe<Scalars['GlobalId']['input']>;
  /** This must be VIVAWALLET */
  paymentProviderDiscriminator?: Scalars['String']['input'];
  posApiClientId: Scalars['String']['input'];
  posApiClientSecret: Scalars['String']['input'];
  useDemoMode: Scalars['Boolean']['input'];
};

export type Webhook = {
  __typename?: 'Webhook';
  /** The date and time this entity was created. */
  createdAt: Scalars['UTCDateTime']['output'];
  /** A unique internal GlobalId for this entity. */
  id: Scalars['GlobalId']['output'];
  owningOrganisation: Organisation;
  subject: WebhookSubject;
  /** The date and time this entity was last updated. */
  updatedAt: Scalars['UTCDateTime']['output'];
  /** The URL to send the webhook payload to */
  url: Scalars['String']['output'];
};

export type WebhookEdge = {
  __typename?: 'WebhookEdge';
  /** The cursor for provided node to be used in pagination */
  cursor?: Maybe<Scalars['String']['output']>;
  /** The Webhook entity */
  node?: Maybe<Webhook>;
};

export type WebhookPageInfo = {
  __typename?: 'WebhookPageInfo';
  /** The cursor for the last node in the page */
  endCursor?: Maybe<Scalars['String']['output']>;
  /** Whether or not there is a another page of data */
  hasNextPage: Scalars['Boolean']['output'];
  /** Whether or not there is a previous page of data */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** The cursor for the first node in the page */
  startCursor?: Maybe<Scalars['String']['output']>;
};

export type WebhookPaginatedPayload = {
  __typename?: 'WebhookPaginatedPayload';
  edges?: Maybe<Array<WebhookEdge>>;
  pageInfo?: Maybe<WebhookPageInfo>;
  /** The total number of items available */
  totalCount: Scalars['Int']['output'];
};

export type WebhookRegisterInput = {
  subject: WebhookSubject;
  url: Scalars['String']['input'];
};

export type WebhookRegisterPayload = {
  __typename?: 'WebhookRegisterPayload';
  /** An array of errors that occurred during the registration of the webhook */
  userErrors: Array<UserError>;
  /** The registered webhooks */
  webhooks: Array<Webhook>;
};

/** A subject for a webhook */
export enum WebhookSubject {
  ProductUpsert = 'ProductUpsert'
}

/** Input for unregistering webhooks. ID or subject must be provided. If ID is provided, only the webhook with the given ID will be unregistered. If subject is provided, all webhooks for that subject will be unregistered. */
export type WebhookUnregisterInput = {
  /** The ID of the webhook to unregister, if subject is not provided */
  id?: InputMaybe<Scalars['GlobalId']['input']>;
  /** The subject to unregister from, if ID is not provided */
  subject?: InputMaybe<WebhookSubject>;
};


export const ReportCatalogStatsDocument = gql`
    mutation reportCatalogStats($knownNumberOfImages: Int, $knownNumberOfProductGroups: Int, $knownNumberOfProductVariants: Int, $knownNumberOfProducts: Int, $retailerClosed: Boolean) {
  reportCatalogStats(
    knownNumberOfImages: $knownNumberOfImages
    knownNumberOfProductGroups: $knownNumberOfProductGroups
    knownNumberOfProductVariants: $knownNumberOfProductVariants
    knownNumberOfProducts: $knownNumberOfProducts
    retailerClosed: $retailerClosed
  )
}
    `;
export const UpsertLocationsDocument = gql`
    mutation UpsertLocations($input: [LocationInput!]!) {
  upsertLocations(input: $input) {
    locations {
      id
      platformProvidedId
    }
    userErrors {
      code
      message
    }
  }
}
    `;
export const UpsertStoreDocument = gql`
    mutation UpsertStore($input: ShopifyStoreInput!, $hmac: String!, $nonce: String!) {
  upsertShopifyOrganisation(input: $input, hmac: $hmac, nonce: $nonce) {
    organisation {
      id
    }
    userErrors {
      message
      code
    }
  }
}
    `;
export const MarkUninstalledDocument = gql`
    mutation MarkUninstalled($input: ShopifyStoreUninstallInput!, $hmac: String!, $nonce: String!) {
  markShopifyOrganisationUninstallStarted(
    input: $input
    hmac: $hmac
    nonce: $nonce
  )
}
    `;
export const UpsertCloudshelfDocument = gql`
    mutation upsertCloudshelf($input: [CloudshelfInput!]!) {
  upsertCloudshelves(input: $input) {
    cloudshelves {
      id
    }
    userErrors {
      code
      message
    }
  }
}
    `;
export const UpsertOrdersDocument = gql`
    mutation upsertOrders($input: [OrderInput!]!) {
  upsertOrders(input: $input) {
    userErrors {
      code
      message
    }
    orders {
      id
    }
  }
}
    `;
export const UpsertProductGroupsDocument = gql`
    mutation upsertProductGroups($input: [ProductGroupInput!]!) {
  upsertProductGroups(input: $input) {
    productGroups {
      id
    }
    userErrors {
      code
      message
    }
  }
}
    `;
export const UpdateProductsInProductGroupDocument = gql`
    mutation updateProductsInProductGroup($productGroupId: GlobalId!, $productIds: [GlobalId!]!) {
  updateProductsInProductGroup(
    productGroupId: $productGroupId
    productIds: $productIds
  )
}
    `;
export const DeleteProductGroupsDocument = gql`
    mutation deleteProductGroups($ids: [GlobalId!]!) {
  deleteProductGroups(ids: $ids) {
    productGroups {
      id
    }
    userErrors {
      code
      message
    }
  }
}
    `;
export const KeepKnownProductGroupsViaFileDocument = gql`
    mutation keepKnownProductGroupsViaFile($fileUrl: String!) {
  keepKnownProductGroupsViaFile(fileUrl: $fileUrl) {
    count
    userErrors {
      code
      message
    }
  }
}
    `;
export const UpsertProductsDocument = gql`
    mutation upsertProducts($input: [ProductInput!]!) {
  upsertProducts(input: $input) {
    products {
      id
    }
    userErrors {
      code
      message
    }
  }
}
    `;
export const UpsertProductVariantsDocument = gql`
    mutation upsertProductVariants($inputs: [UpsertVariantsInput!]!) {
  upsertProductVariants(inputs: $inputs) {
    productVariants {
      id
    }
    userErrors {
      code
      message
    }
  }
}
    `;
export const DeleteProductsDocument = gql`
    mutation deleteProducts($ids: [GlobalId!]!) {
  deleteProducts(ids: $ids) {
    products {
      id
    }
    userErrors {
      code
      message
    }
  }
}
    `;
export const KeepKnownProductsViaFileDocument = gql`
    mutation keepKnownProductsViaFile($fileUrl: String!) {
  keepKnownProductsViaFile(fileUrl: $fileUrl) {
    count
    userErrors {
      code
      message
    }
  }
}
    `;
export const RequestShopifySubscriptionCheckDocument = gql`
    mutation requestShopifySubscriptionCheck($shopifyGid: String!) {
  requestShopifySubscriptionCheck(shopifyGid: $shopifyGid)
}
    `;
export const UpsertThemeDocument = gql`
    mutation upsertTheme($input: ThemeInput!) {
  upsertTheme(input: $input) {
    userErrors {
      code
      message
    }
    theme {
      id
    }
  }
}
    `;
export const KeepKnownVariantsViaFileDocument = gql`
    mutation keepKnownVariantsViaFile($fileUrl: String!) {
  keepKnownVariantsViaFile(fileUrl: $fileUrl) {
    count
    userErrors {
      code
      message
    }
  }
}
    `;
export const ExchangeTokenDocument = gql`
    query ExchangeToken($domain: String!) {
  customToken(domain: $domain)
}
    `;
export const IsInstallCompletedDocument = gql`
    query isInstallCompleted($domain: String!) {
  organisationInstallComplete(domain: $domain)
}
    `;
export type ReportCatalogStatsMutationVariables = Exact<{
  knownNumberOfImages?: InputMaybe<Scalars['Int']['input']>;
  knownNumberOfProductGroups?: InputMaybe<Scalars['Int']['input']>;
  knownNumberOfProductVariants?: InputMaybe<Scalars['Int']['input']>;
  knownNumberOfProducts?: InputMaybe<Scalars['Int']['input']>;
  retailerClosed?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type ReportCatalogStatsMutation = { __typename?: 'Mutation', reportCatalogStats: boolean };

export type UpsertLocationsMutationVariables = Exact<{
  input: Array<LocationInput> | LocationInput;
}>;


export type UpsertLocationsMutation = { __typename?: 'Mutation', upsertLocations: { __typename?: 'LocationUpsertPayload', locations: Array<{ __typename?: 'Location', id: any, platformProvidedId?: any | null }>, userErrors: Array<{ __typename?: 'UserError', code: UserErrorCode, message: string }> } };

export type UpsertStoreMutationVariables = Exact<{
  input: ShopifyStoreInput;
  hmac: Scalars['String']['input'];
  nonce: Scalars['String']['input'];
}>;


export type UpsertStoreMutation = { __typename?: 'Mutation', upsertShopifyOrganisation: { __typename?: 'OrganisationUpsertPayload', organisation?: { __typename?: 'Organisation', id: any } | null, userErrors: Array<{ __typename?: 'UserError', message: string, code: UserErrorCode }> } };

export type MarkUninstalledMutationVariables = Exact<{
  input: ShopifyStoreUninstallInput;
  hmac: Scalars['String']['input'];
  nonce: Scalars['String']['input'];
}>;


export type MarkUninstalledMutation = { __typename?: 'Mutation', markShopifyOrganisationUninstallStarted: boolean };

export type UpsertCloudshelfMutationVariables = Exact<{
  input: Array<CloudshelfInput> | CloudshelfInput;
}>;


export type UpsertCloudshelfMutation = { __typename?: 'Mutation', upsertCloudshelves: { __typename?: 'CloudshelfUpsertPayload', cloudshelves: Array<{ __typename?: 'Cloudshelf', id: any }>, userErrors: Array<{ __typename?: 'UserError', code: UserErrorCode, message: string }> } };

export type UpsertOrdersMutationVariables = Exact<{
  input: Array<OrderInput> | OrderInput;
}>;


export type UpsertOrdersMutation = { __typename?: 'Mutation', upsertOrders: { __typename?: 'OrderUpsertPayload', userErrors: Array<{ __typename?: 'UserError', code: UserErrorCode, message: string }>, orders: Array<{ __typename?: 'Order', id: any }> } };

export type UpsertProductGroupsMutationVariables = Exact<{
  input: Array<ProductGroupInput> | ProductGroupInput;
}>;


export type UpsertProductGroupsMutation = { __typename?: 'Mutation', upsertProductGroups: { __typename?: 'ProductGroupUpsertPayload', productGroups: Array<{ __typename?: 'ProductGroup', id: any }>, userErrors: Array<{ __typename?: 'UserError', code: UserErrorCode, message: string }> } };

export type UpdateProductsInProductGroupMutationVariables = Exact<{
  productGroupId: Scalars['GlobalId']['input'];
  productIds: Array<Scalars['GlobalId']['input']> | Scalars['GlobalId']['input'];
}>;


export type UpdateProductsInProductGroupMutation = { __typename?: 'Mutation', updateProductsInProductGroup: boolean };

export type DeleteProductGroupsMutationVariables = Exact<{
  ids: Array<Scalars['GlobalId']['input']> | Scalars['GlobalId']['input'];
}>;


export type DeleteProductGroupsMutation = { __typename?: 'Mutation', deleteProductGroups: { __typename?: 'ProductGroupDeletePayload', productGroups: Array<{ __typename?: 'ProductGroup', id: any }>, userErrors: Array<{ __typename?: 'UserError', code: UserErrorCode, message: string }> } };

export type KeepKnownProductGroupsViaFileMutationVariables = Exact<{
  fileUrl: Scalars['String']['input'];
}>;


export type KeepKnownProductGroupsViaFileMutation = { __typename?: 'Mutation', keepKnownProductGroupsViaFile: { __typename?: 'ProductGroupDeletionPayload', count: number, userErrors: Array<{ __typename?: 'UserError', code: UserErrorCode, message: string }> } };

export type UpsertProductsMutationVariables = Exact<{
  input: Array<ProductInput> | ProductInput;
}>;


export type UpsertProductsMutation = { __typename?: 'Mutation', upsertProducts: { __typename?: 'ProductUpsertPayload', products: Array<{ __typename?: 'Product', id: any }>, userErrors: Array<{ __typename?: 'UserError', code: UserErrorCode, message: string }> } };

export type UpsertProductVariantsMutationVariables = Exact<{
  inputs: Array<UpsertVariantsInput> | UpsertVariantsInput;
}>;


export type UpsertProductVariantsMutation = { __typename?: 'Mutation', upsertProductVariants: { __typename?: 'ProductVariantUpsertPayload', productVariants: Array<{ __typename?: 'ProductVariant', id: any }>, userErrors: Array<{ __typename?: 'UserError', code: UserErrorCode, message: string }> } };

export type DeleteProductsMutationVariables = Exact<{
  ids: Array<Scalars['GlobalId']['input']> | Scalars['GlobalId']['input'];
}>;


export type DeleteProductsMutation = { __typename?: 'Mutation', deleteProducts: { __typename?: 'ProductDeletePayload', products: Array<{ __typename?: 'Product', id: any }>, userErrors: Array<{ __typename?: 'UserError', code: UserErrorCode, message: string }> } };

export type KeepKnownProductsViaFileMutationVariables = Exact<{
  fileUrl: Scalars['String']['input'];
}>;


export type KeepKnownProductsViaFileMutation = { __typename?: 'Mutation', keepKnownProductsViaFile: { __typename?: 'ProductDeletionPayload', count: number, userErrors: Array<{ __typename?: 'UserError', code: UserErrorCode, message: string }> } };

export type RequestShopifySubscriptionCheckMutationVariables = Exact<{
  shopifyGid: Scalars['String']['input'];
}>;


export type RequestShopifySubscriptionCheckMutation = { __typename?: 'Mutation', requestShopifySubscriptionCheck: boolean };

export type UpsertThemeMutationVariables = Exact<{
  input: ThemeInput;
}>;


export type UpsertThemeMutation = { __typename?: 'Mutation', upsertTheme: { __typename?: 'ThemeUpsertPayload', userErrors: Array<{ __typename?: 'UserError', code: UserErrorCode, message: string }>, theme?: { __typename?: 'Theme', id: any } | null } };

export type KeepKnownVariantsViaFileMutationVariables = Exact<{
  fileUrl: Scalars['String']['input'];
}>;


export type KeepKnownVariantsViaFileMutation = { __typename?: 'Mutation', keepKnownVariantsViaFile: { __typename?: 'ProductVariantDeletionPayload', count: number, userErrors: Array<{ __typename?: 'UserError', code: UserErrorCode, message: string }> } };

export type ExchangeTokenQueryVariables = Exact<{
  domain: Scalars['String']['input'];
}>;


export type ExchangeTokenQuery = { __typename?: 'Query', customToken?: string | null };

export type IsInstallCompletedQueryVariables = Exact<{
  domain: Scalars['String']['input'];
}>;


export type IsInstallCompletedQuery = { __typename?: 'Query', organisationInstallComplete?: boolean | null };
