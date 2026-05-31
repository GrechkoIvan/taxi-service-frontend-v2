# Backend-Oriented Data Entities Overview

## Цель документа
Собрать читабельную сводку по сущностям, которые уже имплицитно существуют в mock API, и показать, как их перенести в реляционную БД без ломки текущего фронта.@json-server.json#1-14

## 1. Сущности и ключевые поля

### 1.1 Users
- Поля: `id`, `email`, `name`, `role` (`customer`/`driver`), `phone`, `password_hash`, timestamps.
- Источник: раздел `users` в `mocks/db.json`.@mocks/db.json#2-27
- Функция: аутентификация и определение роли при логине (`/auth/login`, `/auth/me`).@mocks/authMiddleware.cjs#110-244

### 1.2 Driver Profiles
- Поля: `id`, `user_id` (FK → users), `comfort_level`, `driver_license_number`, `car_id`, `is_online`, `coords`, `updated_at`.
- Источник: массив `drivers` + доп. поля из утверждённой заявки.@mocks/db.json#28-47@mocks/managerApplicationsMiddleware.cjs#148-190
- Функция: статус выхода на линию, фильтр доступных заказов по комфорту, карточка автомобиля внутри заказа.@mocks/ordersMiddleware.cjs#293-487

### 1.3 Cars
- Поля: `id`, `make`, `model`, `color`, `plate`, `driver_profile_id`.
- Источник: вложенный объект `car` у драйвера/заявки.@mocks/db.json#28-66
- Функция: показывать клиенту машину и хранить данные для менеджеров.@src/features/order-creation/CustomerOrderTracker.tsx#311-349

### 1.4 Driver Applications
- Поля: `id`, `email`, `name`, `phone`, `password_hash`, `status`, `created_at`, `reviewed_at`, `reviewed_by_manager_id`, `driver_profile_id`, `comfort_level`, `driver_license_number`, `car_*`, `manager_comment`.
- Источник: `driverApplications` в мок-БД.@mocks/db.json#48-80
- Функция: процесс подачи/апрува заявки, работа менеджерских эндпоинтов approve/reject.@mocks/managerApplicationsMiddleware.cjs#57-235

### 1.5 Managers
- Поля: `id`, `login`, `password_hash`, `name`.
- Источник: `managers` + managerAuth middleware.@mocks/db.json#81-88@mocks/managerAuthMiddleware.cjs#95-166
- Функция: портал менеджера (вход, сессия, проверка заявок).@src/shared/api/services/managerAuthService.ts#20-50

### 1.6 Orders
- Поля: `id`, `customer_id` (FK → users), `driver_id` (FK → driver_profiles), адреса и координаты A/B, `comfort_type`, `distance_meters`, `duration_seconds`, `price_byn`, `status`, `created_at`, `accepted_at`, `updated_at`, `canceled_at`.
- Источник: `orders` + логика PATCH в middleware.@mocks/db.json#89-203@mocks/ordersMiddleware.cjs#62-145
- Функция: core-флоу клиента (создание, подбор, отмена, назначение водителя).@src/features/order-creation/OrderPanelForm.tsx#54-141

### 1.7 Order Status History (новая таблица)
- Поля: `order_id`, `status`, `changed_by`, `changed_at`.
- Причина: сейчас статусы жёстко контролируются middleware, но история не хранится; для реальной БД нужен аудит переходов `searching_driver → … → finished`.@mocks/ordersMiddleware.cjs#62-145

### 1.8 Reviews
- Поля: `id`, `order_id`, `driver_id`, `customer_id`, `rating`, `text`, `created_at`.
- Источник: `reviews` и API `createReview`.@mocks/db.json#499-597@src/shared/api/services/reviewService.ts#15-21
- Функция: клиент оставляет отзыв, водитель получает рейтинг, UI показывает историю.@src/features/order-creation/CustomerOrderTracker.tsx#185-395

### 1.9 Driver Review Stats (агрегат/вид)
- Поля: `driver_id`, `average_rating`, `total_reviews`, `updated_at`.
- Источник: сейчас вычисляется на лету в middleware.@mocks/ordersMiddleware.cjs#34-210
- Функция: быстро отдавать `/customers/drivers/:id/public` и рейтинг в профиле водителя.@src/shared/api/services/customerOrderService.ts#51-82

### 1.10 Sessions
- Поля: `id`, `user_id`, `token_hash`, `expires_at`, `user_agent`, `type` (customer/driver/manager).
- Источник: куки `access_token` и `manager_access_token`.@mocks/authMiddleware.cjs#18-63@mocks/managerAuthMiddleware.cjs#18-63
- Функция: централизованно управлять сессиями, ревок токенов, аудит входов.

## 2. Связи и ограничения
1. **Users ↔ Driver Profiles** — строгая пара 1:1 для записей role=driver. При approve заявки одновременно создаются user и profile, а сама заявка получает `driver_profile_id`.@mocks/managerApplicationsMiddleware.cjs#131-196
2. **Orders ↔ Users/Driver Profiles** — FK на клиента и водителя; переходы статусов ограничены (можно описать матрицей переходов или CHECK + trigger).@mocks/ordersMiddleware.cjs#93-145
3. **Orders ↔ Reviews** — один отзыв на заказ (`reviews.order_id` уникален), `driver_id` и `customer_id` в отзыве дублируют связи и должны проверяться триггером.@mocks/db.json#499-597
4. **Driver Applications ↔ Managers** — поле `reviewed_by_manager_id` тянется к `managers.id`. Также заявка хранит ссылку на итоговый `driver_profile_id` для отслеживания источника данных.@mocks/managerApplicationsMiddleware.cjs#148-196
5. **Driver Online Status** — `driver_profiles.is_online` и `coords` обновляются из `/drivers/me`; дополнительно можно завести `driver_locations` для истории координат.@mocks/ordersMiddleware.cjs#323-368

## 3. Маппинг требований → сущностей
- **Регистрация клиента и логин** → `users`, `sessions`; соответствие формам `customerRegistrationSchema`.@src/shared/lib/schemas/authSchemas.ts#7-42
- **Заявка водителя** → `driver_applications` (черновик), затем `users + driver_profiles + cars` после approve.@src/shared/api/services/authService.ts#33-45@mocks/managerApplicationsMiddleware.cjs#87-235
- **Создание заказа** → `orders` (payload из OrderPanel: адреса, координаты, цена, статус `searching_driver`).@src/features/order-creation/OrderPanelForm.tsx#97-140
- **Отслеживание заказа** → `orders` + `driver_profiles` + `cars` + `driver_review_stats` (данные для CustomerOrderTracker).@src/features/order-creation/CustomerOrderTracker.tsx#125-353
- **Отзыв** → `reviews` + обновление `driver_review_stats`.
- **Режим водителя** → `driver_profiles.is_online/coords` и выборка доступных заказов по `comfort_level`.@src/shared/lib/stores/driverModeStore.ts#1-20@mocks/ordersMiddleware.cjs#466-487

## 4. Рекомендации по реляционной схеме
1. Ввести явные FK + индексы на `orders.customer_id`, `orders.driver_id`, `reviews.driver_id`, `driver_profiles.user_id`, `driver_applications.reviewed_by_manager_id`.
2. Выделить ENUM или справочные таблицы для `comfort_level` и `order_status`, описать допустимые переходы (можно хранить в отдельной таблице).@mocks/ordersMiddleware.cjs#62-145
3. Координаты хранить типом `POINT`/`GEOGRAPHY` или парой `latitude`/`longitude` с CHECK по диапазону.
4. Добавить таблицы истории (`order_status_history`, опционально `driver_location_history`) для аналитики и SLA.
5. `driver_review_stats` поддерживать триггером на `reviews` либо обновлять фоновой задачей, чтобы не считать среднее на каждом запросе.@mocks/ordersMiddleware.cjs#34-210

## 5. Вывод
Все необходимые сущности уже описаны в mock-сценариях. Перенос заключается в том, чтобы закрепить эти структуры в реляционной схеме, добавить историю/агрегаты и перенести бизнес-правила middleware в ограничения БД. После этого фронт сможет без изменений переключиться на настоящий REST API, а бэкенд — развиваться дальше (реальный роутинг, push-уведомления и т.д.).
