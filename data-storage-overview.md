# Сводка по текущему хранению данных

## 1. Уровни хранения и кеширования
- **Mock API** развёрнут на `json-server` (порт 3001) с цепочкой middleware для аутентификации, менеджерских проверок и бизнес-логики заказов/отзывов, поэтому все REST-запросы фронтенда завершаются здесь без отдельного бэкенда.@json-server.json#1-14
- **Основной источник данных** — локальный `mocks/db.json`, который копируется из примера и игнорируется Git, чтобы хранить реальные пароли/ключи только локально.@README.md#17-25
- **Состояние клиента** дополняет mock-базу: `authStore` и `managerAuthStore` персистят авторизационные данные в `localStorage`, `driverModeStore` хранит онлайн-статус водителя там же, а `orderCreationStore` складывает черновик маршрута/точек A-B и кэш маршрута в `sessionStorage`.@src/shared/lib/stores/authStore.ts#1-108@src/shared/lib/stores/managerAuthStore.ts#1-93@src/shared/lib/stores/driverModeStore.ts#1-21@src/shared/lib/stores/orderCreationStore.ts#1-115
- **React Query** поверх REST-сервисов кэширует сетевые ответы (например, текущий заказ, публичные данные водителя) и переиспользуется в OrderPanel/CustomerOrderTracker для мутаций и опроса mock-бэкенда.@src/features/order-creation/OrderPanelForm.tsx#54-141@src/features/order-creation/CustomerOrderTracker.tsx#1-210

## 2. Сущности JSON Server
### Users
`users` содержит базовые профили клиентов и водителей: `id`, `email`, `name`, `role` (`customer`/`driver`), `phone`, `passwordHash`. Эти записи используют JWT-аутентификация и отношения с другими таблицами (по `id`).@mocks/db.json#2-27

### Drivers
`drivers` дополняет водителей расширенными полями: `userId` (связь с `users`), `comfortLevel`, `driverLicenseNumber`, `car` (make/model/color/plate), `isOnline`, `coords`, `updatedAt`. Эта таблица служит источником статуса выхода «на линию» и карточек автомобиля.@mocks/db.json#28-47

### DriverApplications
Заявки кандидатов содержат контактные данные, `passwordHash`, статус (`pending/approved/rejected`), временные метки, результат модерации, а после одобрения — связанный `driverId`, номер прав, параметры автомобиля и выбранный комфорт.@mocks/db.json#48-80@src/shared/api/types/driverApplicationTypes.ts#1-43

### Managers
Менеджеры имеют `id`, `login`, `password`/`passwordHash` и `name`. Они аутентифицируются отдельной кукой `manager_access_token` и управляют заявками.@mocks/db.json#81-88

### Orders
Каждый заказ хранит `customerId`, адреса/координаты A и B, `comfortType`, дистанцию и длительность по маршруту, рассчитанную цену в белорусских рублях, текущее состояние, а также временные метки `createdAt`, `acceptedAt`, `updatedAt`, `canceledAt` и ссылку на `driverId`, когда водитель назначен.@mocks/db.json#89-180@src/shared/api/types/orderTypes.ts#1-33

### Reviews
Отзывы ссылаются на поездку и участников: `orderId`, `driverId`, `customerId`, `rating 1–5`, опциональный `text`, `createdAt`, `id`. Они используются для формирования средних оценок и истории поездок.@mocks/db.json#499-597@src/shared/api/types/reviewTypes.ts#1-12

## 3. API и middleware слоя mock-бэкенда
### Аутентификация клиентов и водителей
`authMiddleware.cjs` обрабатывает регистрацию клиента, отправку заявки водителя, логин/логаут и `/auth/me`. Пароли хешируются SHA-256, токены кладутся в куку `access_token`, а ответы возвращают объект пользователя без `passwordHash`.@mocks/authMiddleware.cjs#110-244

### Менеджерские эндпоинты
`managerAuthMiddleware` выдаёт/проверяет `manager_access_token` и отдаёт профиль менеджера, а `managerApplicationsMiddleware` защищает `/manager/**` и даёт CRUD над заявками: фильтрация по статусу, просмотр карточки, approve (создание записи в `users` и `drivers`), reject с комментарием.@mocks/managerAuthMiddleware.cjs#95-166@mocks/managerApplicationsMiddleware.cjs#41-235

### Общие правила заказов
`ordersMiddleware.cjs` валидирует PATCH `/orders/:id`: клиенты могут отменять только свои заявки в статусе `searching_driver`, водители принимают заказы и переводят статус пошагово `accepted → arrived → in_progress → finished`.@mocks/ordersMiddleware.cjs#62-145

### Клиентские эндпоинты
Под `/customers/**` доступны: текущий заказ с fallback на последний завершённый без отзыва, история заказов (order + review), публичные данные назначенного водителя и сводка по его отзывам, всё это только для заказов конкретного клиента.@mocks/ordersMiddleware.cjs#148-282

### Водительские эндпоинты
`/drivers/**` покрывает получение/обновление профиля, переключение онлайна с координатами, список доступных заказов по уровню комфорта, текущий активный заказ, историю завершённых поездок с отзывами и публичные данные клиента, если у водителя есть активный заказ с ним.@mocks/ordersMiddleware.cjs#293-487

## 4. Клиентские сервисы доступа к данным
- `authService` инкапсулирует REST-запросы регистрации, логина, заявок водителей и проверки сессии; ошибки унифицируются через `toErrorMessage`.@src/shared/api/services/authService.ts#22-72
- `orderService` создаёт заказы, принимая полный `CreateOrderPayload` (значения формируются на фронте).@src/shared/api/services/orderService.ts#1-22
- `customerOrderService` даёт текущий заказ, историю (order+review), отмену и публичные данные/рейтинг назначенного водителя.@src/shared/api/services/customerOrderService.ts#16-82
- `driverService` обслуживает профиль, список заказов (available/current/history), изменение статусов и получение отзывов водителя.@src/shared/api/services/driverService.ts#44-160
- `reviewService` отправляет отзыв после завершения поездки.@src/shared/api/services/reviewService.ts#15-21

## 5. Использование данных во фронтенде
- **OrderPanelForm** подтягивает точку A/B и маршрут из `orderCreationStore`, валидирует форму Zod-схемой и через `createOrder` отправляет собранный payload (координаты, адреса, расчёт цены, статус `searching_driver`).@src/features/order-creation/OrderPanelForm.tsx#54-141
- **CustomerOrderTracker** опрашивает `/customers/orders/current`, синхронизирует `activeOrder` в сторе, позволяет отменить заказ, подтягивает публичные данные водителя и даёт форму отзыва, которую отправляет через `reviewService`.@src/features/order-creation/CustomerOrderTracker.tsx#1-255
- **Zustand stores**: `authStore`/`managerAuthStore` хранят пользователя/менеджера и вызывают соответствующие logout API; `driverModeStore` фиксирует режим «на линии»; `orderCreationStore` держит маршрут, активный заказ и служебные флаги для UI карт.@src/shared/lib/stores/authStore.ts#1-108@src/shared/lib/stores/managerAuthStore.ts#1-93@src/shared/lib/stores/driverModeStore.ts#1-21@src/shared/lib/stores/orderCreationStore.ts#1-115

## 6. Наблюдения для перехода к реляционной модели
1. **Связи пользователей**: `drivers.userId`, `orders.customerId/driverId`, `reviews.customerId/driverId`, `driverApplications.driverId` и `driverApplications.reviewedByManagerId` логически являются foreign keys, которые стоит явно описать при переносе.@mocks/db.json#28-203
2. **Дублирование профиля водителя**: поля автомобиля и прав живут и в `driverApplications`, и в финальной записи `drivers`, поэтому в БД можно выделить отдельные таблицы `driver_profiles`, `cars`, `licenses` и ссылаться на них из заявок и активных водителей.@mocks/db.json#28-80
3. **Заказы и статусы**: миддлвар жёстко ограничивает переходы состояний, что можно перенести в CHECK-constraint или хранимую процедуру/триггер, плюс хранить историю статусов отдельно, если нужно аудировать изменения.@mocks/ordersMiddleware.cjs#62-145
4. **Отчёты по отзывам**: агрегаты (avg rating, totalReviews) сейчас пересчитываются на лету в middleware; в реляционной БД можно завести материализованный вид или денормализованное поле с триггером обновления.@mocks/ordersMiddleware.cjs#34-210
5. **Кеш маршрута**: фронт хранит расчёты дистанции/длительности в `orderCreationStore`, но сами значения уходят в `orders.distanceMeters/durationSeconds/priceByN`, поэтому в БД нужно место для технических полей расчёта и, при необходимости, таблицу истории расчётов.@mocks/db.json#89-150@src/shared/lib/stores/orderCreationStore.ts#1-115
