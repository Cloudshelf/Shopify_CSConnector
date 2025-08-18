<p align="center">
  <img src="https://github.com/Cloudshelf/Shopify_CSConnector/assets/3884418/e2bef8c3-21a6-40d2-afa9-7e347ec78add" />
</p>

An open-source connector which connects Shopify to the [Cloudshelf Omnichannel API](https://documentation.cloudshelf.ai).

#### Built with:
| Purpose  | Technology |
| ------------- | ------------- |
| Node.Js Framework  | [NestJS](https://nestjs.com/)  |
| GraphQL | [Apollo GraphQL](https://apollographql.com/)  |
| ORM | [MikroORM](https://mikro-orm.io/)  |
| Application Performance Monitoring | [OpenTelemetry](https://opentelemetry.io/) with [Axiom](https://axiom.co/)  |
| Shopify Connection | [NestJS Shopify**](https://github.com/nestjs-shopify/nestjs-shopify)  |
| Code Style | [Prettier](https://prettier.io/)  |
| Vulnerability Scanning | [Dependabot](https://github.com/dependabot)  |
| Automated Code Reviews | [Coderabbit](https://coderabbit.ai/)  |

** NestJS Shopify does not support private/custom shopify applications(Shopify dropped support for this going forward), as some of our early clients still use these we had to create a patch for this library which can be found in [patches](/patches)

#### Looking to make your own connector?
No problem! If this connector doesn't do exactly what you need you can make your own using our [Omnichannel API Documentation](https://documentation.cloudshelf.ai)



## License

Cloudshelf Connector for Shopify is [MIT licensed](LICENSE).
