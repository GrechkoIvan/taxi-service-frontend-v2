# Спецификация backend API

## 1. Общая информация для фронтенда

- Базовый адрес API: `http://localhost:${PORT}`
- Порт по умолчанию: `3000`
- Swagger-документация: `http://localhost:${PORT}/api/docs`
- Глобальный префикс API: отсутствует, маршруты начинаются от корня
- Формат авторизации: JWT Bearer
- Заголовок для защищённых запросов: `Authorization: Bearer <access_token>`
- Глобальная валидация: `ValidationPipe({ transform: true, whitelist: true })`
- Это означает, что параметры пути и query-параметры автоматически приводятся к нужным типам, а лишние поля из body отбрасываются
- Формат дат в ответах: ISO 8601 строка, например `2026-04-27T10:15:00.000Z`
- Роли доступа: `customer`, `driver`, `manager`
- Все защищённые эндпоинты возвращают `401`, если токен отсутствует или невалиден, и `403`, если роль не подходит
- Общий формат ошибок HTTP в приложении соответствует схеме `HttpExceptionResponse`

### 1.1. Общая схема ошибки

```json
{
  "statusCode": 400,
  "message": "Некорректные данные",
  "error": "Bad Request"
}
```

Схема может также содержать `message` как массив строк при ошибках валидации.

### 1.2. Общие соглашения по типам

- `number` в body/query/path всегда ожидается как число после трансформации `class-transformer`
- `boolean` в body ожидается как булево значение
- `null` в ответах используется для необязательных полей, если данные ещё не заполнены
- Поля `credentials` и `driverProfile` в профиле пользователя являются вложенными объектами
- Для пагинируемых ответов используется объект с полями `data` и `meta`

## 2. Схемы данных

### 2.1. Авторизация

#### `RegisterCustomerDto`

| Поле       | Тип    | Обязательное | Ограничения                           | Пример          |
| ---------- | ------ | -----------: | ------------------------------------- | --------------- |
| `email`    | string |           да | валидный email                        | `user@test.by`  |
| `password` | string |           да | минимум 6 символов                    | `password123`   |
| `name`     | string |           да | минимум 2 символа                     | `Иван`          |
| `phone`    | string |           да | телефон по regex `^\+?[1-9]\d{1,14}$` | `+375291234567` |

#### `LoginDto`

| Поле       | Тип                                 | Обязательное | Ограничения                 | Пример         |
| ---------- | ----------------------------------- | -----------: | --------------------------- | -------------- |
| `email`    | string                              |           да | валидный email              | `user@test.by` |
| `password` | string                              |           да | минимум 6 символов          | `password123`  |
| `role`     | `customer` \| `driver` \| `manager` |           да | одно из значений `UserRole` | `customer`     |

#### `AuthTokenDto`

| Поле           | Тип    | Обязательное | Описание          | Пример          |
| -------------- | ------ | -----------: | ----------------- | --------------- |
| `access_token` | string |           да | JWT токен доступа | `eyJhbGciOi...` |

#### `MessageResponseDto`

| Поле      | Тип    | Обязательное | Описание            | Пример                    |
| --------- | ------ | -----------: | ------------------- | ------------------------- |
| `message` | string |           да | текстовое сообщение | `Logged out successfully` |

### 2.2. Пользователь и профиль

#### `UpdateProfileDto`

| Поле    | Тип    | Обязательное | Ограничения                          | Пример          |
| ------- | ------ | -----------: | ------------------------------------ | --------------- |
| `name`  | string |          нет | строка                               | `Иван`          |
| `phone` | string |          нет | строка по regex `^\+?[1-9]\d{1,14}$` | `+375291234567` |

#### `UserProfileDto`

| Поле            | Тип                                 | Обязательное | Описание                   | Пример                     |
| --------------- | ----------------------------------- | -----------: | -------------------------- | -------------------------- |
| `id`            | number                              |           да | ID пользователя            | `12`                       |
| `name`          | string                              |           да | имя                        | `Иван`                     |
| `phone`         | string                              |           да | телефон                    | `+375291234567`            |
| `role`          | `customer` \| `driver` \| `manager` |           да | роль пользователя          | `customer`                 |
| `createdAt`     | string \| null                      |          нет | дата создания              | `2026-04-27T08:30:00.000Z` |
| `updatedAt`     | string \| null                      |          нет | дата обновления            | `2026-04-27T09:00:00.000Z` |
| `driverProfile` | object \| null                      |          нет | вложенный профиль водителя | см. ниже                   |
| `credentials`   | object \| null                      |          нет | учётные данные             | см. ниже                   |

##### `DriverProfileDto` внутри `UserProfileDto`

| Поле            | Тип                                          | Обязательное | Описание                   | Пример                     |
| --------------- | -------------------------------------------- | -----------: | -------------------------- | -------------------------- |
| `id`            | number                                       |           да | ID профиля                 | `7`                        |
| `userId`        | number                                       |           да | ID пользователя            | `12`                       |
| `comfortLevel`  | `economy` \| `comfort` \| `business` \| null |          нет | класс комфорта             | `comfort`                  |
| `driverLicense` | string                                       |           да | водительское удостоверение | `AB1234567`                |
| `updatedAt`     | string \| null                               |          нет | дата обновления            | `2026-04-27T10:00:00.000Z` |
| `isOnline`      | boolean                                      |           да | онлайн-статус              | `true`                     |
| `cars`          | array<object> \| null                        |          нет | список автомобилей         | см. ниже                   |

##### `CarDto` внутри `DriverProfileDto`

| Поле       | Тип            | Обязательное | Описание            | Пример      |
| ---------- | -------------- | -----------: | ------------------- | ----------- |
| `id`       | number         |           да | ID автомобиля       | `3`         |
| `driverId` | number         |           да | ID профиля водителя | `7`         |
| `make`     | string         |           да | марка               | `Toyota`    |
| `model`    | string         |           да | модель              | `Camry`     |
| `color`    | string \| null |          нет | цвет                | `Белый`     |
| `number`   | string         |           да | номер автомобиля    | `1234 AB-7` |

##### `UserCredentialDto` внутри `UserProfileDto`

| Поле    | Тип    | Обязательное | Описание             | Пример         |
| ------- | ------ | -----------: | -------------------- | -------------- |
| `email` | string |           да | email учётной записи | `user@test.by` |

#### `UpdateDriverStatusDto`

| Поле       | Тип     | Обязательное | Описание            | Пример |
| ---------- | ------- | -----------: | ------------------- | ------ |
| `isOnline` | boolean |           да | новый онлайн-статус | `true` |

### 2.3. Заявка водителя

#### `CreateDriverApplicationDto`

| Поле       | Тип    | Обязательное | Ограничения                           | Пример           |
| ---------- | ------ | -----------: | ------------------------------------- | ---------------- |
| `email`    | string |           да | валидный email                        | `driver@test.by` |
| `password` | string |           да | минимум 6 символов                    | `password123`    |
| `name`     | string |           да | строка                                | `Иван`           |
| `phone`    | string |           да | телефон по regex `^\+?[1-9]\d{1,14}$` | `+375291234567`  |

#### `ProcessApplicationDto`

| Поле                  | Тип                                  | Обязательное | Ограничения             | Пример                |
| --------------------- | ------------------------------------ | -----------: | ----------------------- | --------------------- |
| `action`              | `approve` \| `reject`                |           да | одно из двух значений   | `approve`             |
| `comment`             | string                               |          нет | требуется при `reject`  | `Недостаточно данных` |
| `driverLicenseNumber` | string                               |          нет | требуется при `approve` | `AB1234567`           |
| `carMake`             | string                               |          нет | требуется при `approve` | `Toyota`              |
| `carModel`            | string                               |          нет | требуется при `approve` | `Camry`               |
| `carColor`            | string                               |          нет | требуется при `approve` | `Белый`               |
| `carPlate`            | string                               |          нет | требуется при `approve` | `1234 AB-7`           |
| `comfortLevel`        | `economy` \| `comfort` \| `business` |          нет | требуется при `approve` | `comfort`             |

Примечание: поля для `approve` и `reject` валидируются условно через `ValidateIf`.

#### `DriverApplicationResponseDto`

| Поле            | Тип                                          | Обязательное | Описание                       | Пример                     |
| --------------- | -------------------------------------------- | -----------: | ------------------------------ | -------------------------- |
| `id`            | number                                       |           да | ID заявки                      | `10`                       |
| `email`         | string                                       |           да | email заявителя                | `driver@test.by`           |
| `name`          | string                                       |           да | имя заявителя                  | `Иван`                     |
| `phone`         | string                                       |           да | телефон заявителя              | `+375291234567`            |
| `passwordHash`  | string                                       |           да | хэш пароля                     | `$2b$10$hash`              |
| `driverLicense` | string \| null                               |          нет | номер удостоверения            | `AB1234567`                |
| `carMake`       | string \| null                               |          нет | марка авто                     | `Toyota`                   |
| `carModel`      | string \| null                               |          нет | модель авто                    | `Camry`                    |
| `carColor`      | string \| null                               |          нет | цвет авто                      | `Белый`                    |
| `carNumber`     | string \| null                               |          нет | номер авто                     | `1234 AB-7`                |
| `comfortLevel`  | `economy` \| `comfort` \| `business` \| null |          нет | класс комфорта                 | `comfort`                  |
| `status`        | `pending` \| `approved` \| `rejected`        |           да | статус заявки                  | `pending`                  |
| `comment`       | string \| null                               |          нет | комментарий менеджера          | `Не хватает данных`        |
| `reviewedBy`    | number \| null                               |          нет | ID менеджера                   | `5`                        |
| `reviewedAt`    | string \| null                               |          нет | дата рассмотрения              | `2026-04-27T12:00:00.000Z` |
| `driverId`      | number \| null                               |          нет | ID созданного профиля водителя | `7`                        |
| `createdAt`     | string \| null                               |          нет | дата подачи                    | `2026-04-27T09:00:00.000Z` |

### 2.4. Заказы

#### `CreateOrderDto`

| Поле               | Тип                                  | Обязательное | Ограничения            | Пример                     |
| ------------------ | ------------------------------------ | -----------: | ---------------------- | -------------------------- |
| `pickupAddress`    | string                               |           да | строка                 | `Минск, ул. Ленина 1`      |
| `pickupLatitude`   | number                               |          нет | `latitude`             | `53.902334`                |
| `pickupLongitude`  | number                               |          нет | `longitude`            | `27.561879`                |
| `dropoffAddress`   | string                               |           да | строка                 | `Минск, пр. Победителей 7` |
| `dropoffLatitude`  | number                               |          нет | `latitude`             | `53.910123`                |
| `dropoffLongitude` | number                               |          нет | `longitude`            | `27.534567`                |
| `comfortLevel`     | `economy` \| `comfort` \| `business` |           да | один из `ComfortLevel` | `economy`                  |

#### `UpdateOrderStatusDto`

| Поле     | Тип                                                                               | Обязательное | Описание            | Пример           |
| -------- | --------------------------------------------------------------------------------- | -----------: | ------------------- | ---------------- |
| `status` | `searchingDriver` \| `driverAssigned` \| `inProgress` \| `finished` \| `canceled` |           да | новый статус заказа | `driverAssigned` |

#### `OrderResponseDto`

| Поле               | Тип                                                                               | Обязательное | Описание                | Пример                     |
| ------------------ | --------------------------------------------------------------------------------- | -----------: | ----------------------- | -------------------------- |
| `id`               | number                                                                            |           да | ID заказа               | `101`                      |
| `customerId`       | number                                                                            |           да | ID клиента              | `12`                       |
| `driverId`         | number \| null                                                                    |          нет | ID водителя             | `7`                        |
| `pickupAddress`    | string                                                                            |           да | адрес подачи            | `Минск, ул. Ленина 1`      |
| `pickupLatitude`   | number \| null                                                                    |          нет | широта подачи           | `53.902334`                |
| `pickupLongitude`  | number \| null                                                                    |          нет | долгота подачи          | `27.561879`                |
| `dropoffAddress`   | string                                                                            |           да | адрес назначения        | `Минск, пр. Победителей 7` |
| `dropoffLatitude`  | number \| null                                                                    |          нет | широта назначения       | `53.910123`                |
| `dropoffLongitude` | number \| null                                                                    |          нет | долгота назначения      | `27.534567`                |
| `comfortLevel`     | `economy` \| `comfort` \| `business`                                              |           да | класс комфорта          | `economy`                  |
| `distanceMeters`   | number \| null                                                                    |          нет | дистанция в метрах      | `5400`                     |
| `durationSec`      | number \| null                                                                    |          нет | длительность в секундах | `780`                      |
| `priceByn`         | number \| null                                                                    |          нет | цена в BYN              | `8.5`                      |
| `status`           | `searchingDriver` \| `driverAssigned` \| `inProgress` \| `finished` \| `canceled` |           да | текущий статус          | `searchingDriver`          |
| `createdAt`        | string \| null                                                                    |          нет | дата создания           | `2026-04-27T10:15:00.000Z` |
| `updatedAt`        | string \| null                                                                    |          нет | дата обновления         | `2026-04-27T10:16:00.000Z` |
| `acceptedAt`       | string \| null                                                                    |          нет | время принятия          | `2026-04-27T10:20:00.000Z` |
| `finishedAt`       | string \| null                                                                    |          нет | время завершения        | `2026-04-27T10:45:00.000Z` |

#### `PaginationQueryDto`

| Поле    | Тип    | Обязательное | Значение по умолчанию | Ограничения      | Пример |
| ------- | ------ | -----------: | --------------------: | ---------------- | ------ |
| `page`  | number |          нет |                   `1` | целое число >= 1 | `1`    |
| `limit` | number |          нет |                  `10` | целое число >= 1 | `10`   |

#### `PaginatedMetaDto`

| Поле      | Тип     | Обязательное | Описание                   | Пример |
| --------- | ------- | -----------: | -------------------------- | ------ |
| `total`   | number  |           да | всего элементов            | `125`  |
| `page`    | number  |           да | текущая страница           | `2`    |
| `limit`   | number  |           да | лимит на страницу          | `10`   |
| `offset`  | number  |           да | смещение                   | `10`   |
| `hasMore` | boolean |           да | есть ли следующая страница | `true` |

#### `PaginatedDto<T>`

| Поле   | Тип                | Обязательное | Описание                          |
| ------ | ------------------ | -----------: | --------------------------------- |
| `data` | array<T>           |           да | список элементов текущей страницы |
| `meta` | `PaginatedMetaDto` |           да | мета-информация пагинации         |

### 2.5. Публичная информация

#### `PublicUserDto`

| Поле    | Тип    | Обязательное | Описание             | Пример          |
| ------- | ------ | -----------: | -------------------- | --------------- |
| `name`  | string |           да | имя пользователя     | `Иван`          |
| `phone` | string |           да | телефон пользователя | `+375291234567` |

#### `DriverCarDto`

| Поле     | Тип            | Обязательное | Описание          | Пример      |
| -------- | -------------- | -----------: | ----------------- | ----------- |
| `make`   | string         |           да | марка автомобиля  | `Toyota`    |
| `model`  | string         |           да | модель автомобиля | `Camry`     |
| `color`  | string \| null |          нет | цвет              | `Белый`     |
| `number` | string         |           да | номер             | `1234 AB-7` |

#### `DriverPublicInfoDto`

| Поле            | Тип                                          | Обязательное | Описание                      | Пример      |
| --------------- | -------------------------------------------- | -----------: | ----------------------------- | ----------- |
| `id`            | number                                       |           да | ID профиля водителя           | `7`         |
| `userId`        | number                                       |           да | ID пользователя               | `12`        |
| `comfortLevel`  | `economy` \| `comfort` \| `business` \| null |          нет | класс комфорта                | `comfort`   |
| `driverLicense` | string                                       |           да | водительское удостоверение    | `AB1234567` |
| `isOnline`      | boolean                                      |           да | онлайн-статус                 | `true`      |
| `user`          | `PublicUserDto`                              |           да | публичные данные пользователя | см. выше    |
| `cars`          | `DriverCarDto[]`                             |           да | список машин                  | см. выше    |

#### `CustomerPublicInfoDto`

| Поле    | Тип    | Обязательное | Описание        | Пример          |
| ------- | ------ | -----------: | --------------- | --------------- |
| `name`  | string |           да | имя клиента     | `Иван`          |
| `phone` | string |           да | телефон клиента | `+375291234567` |

### 2.6. Отзывы

#### `CreateReviewDto`

| Поле      | Тип    | Обязательное | Ограничения           | Пример              |
| --------- | ------ | -----------: | --------------------- | ------------------- |
| `rating`  | number |           да | целое число от 1 до 5 | `5`                 |
| `comment` | string |          нет | строка                | `Вежливый водитель` |

#### `ReviewResponseDto`

| Поле        | Тип            | Обязательное | Описание      | Пример                     |
| ----------- | -------------- | -----------: | ------------- | -------------------------- |
| `id`        | number         |           да | ID отзыва     | `55`                       |
| `orderId`   | number         |           да | ID заказа     | `101`                      |
| `rating`    | number         |           да | оценка        | `5`                        |
| `comment`   | string \| null |          нет | комментарий   | `Вежливый водитель`        |
| `createdAt` | string \| null |          нет | дата создания | `2026-04-27T11:00:00.000Z` |

#### `DriverReviewOrderInfoDto`

| Поле             | Тип            | Обязательное | Описание             | Пример                     |
| ---------------- | -------------- | -----------: | -------------------- | -------------------------- |
| `id`             | number         |           да | ID заказа            | `101`                      |
| `pickupAddress`  | string         |           да | адрес подачи         | `Минск, ул. Ленина 1`      |
| `dropoffAddress` | string         |           да | адрес назначения     | `Минск, пр. Победителей 7` |
| `createdAt`      | string \| null |          нет | дата создания заказа | `2026-04-27T09:30:00.000Z` |

#### `DriverReviewItemDto`

| Поле        | Тип                        | Обязательное | Описание                      | Пример                     |
| ----------- | -------------------------- | -----------: | ----------------------------- | -------------------------- |
| `id`        | number                     |           да | ID отзыва                     | `55`                       |
| `orderId`   | number                     |           да | ID заказа                     | `101`                      |
| `rating`    | number                     |           да | оценка                        | `5`                        |
| `comment`   | string \| null             |          нет | комментарий                   | `Вежливый водитель`        |
| `createdAt` | string \| null             |          нет | дата создания                 | `2026-04-27T11:00:00.000Z` |
| `order`     | `DriverReviewOrderInfoDto` |           да | вложенная информация о заказе | см. выше                   |

## 3. Контроллеры и эндпоинты

### 3.1. AuthController

Базовый путь: `/auth`

#### POST `/auth/register/customer`

- Краткое описание: регистрация нового клиента
- Что делает: создаёт пользователя с ролью `customer` и сразу возвращает JWT токен
- Доступ: публичный
- Тело запроса: `RegisterCustomerDto`
- Ответ: `AuthTokenDto`
- Возможные статусы: `201`, `400`, `409`

##### Request schema

```json
{
  "email": "user@test.by",
  "password": "password123",
  "name": "Иван",
  "phone": "+375291234567"
}
```

##### Response schema

```json
{
  "access_token": "eyJhbGciOi..."
}
```

#### POST `/auth/login`

- Краткое описание: вход в систему
- Что делает: проверяет email, пароль и роль, затем выдаёт JWT токен
- Доступ: публичный
- Тело запроса: `LoginDto`
- Ответ: `AuthTokenDto`
- Возможные статусы: `200`, `400`, `401`

##### Request schema

```json
{
  "email": "user@test.by",
  "password": "password123",
  "role": "customer"
}
```

##### Response schema

```json
{
  "access_token": "eyJhbGciOi..."
}
```

#### DELETE `/auth/session`

- Краткое описание: выход из системы
- Что делает: завершает текущую сессию на уровне API-контракта и возвращает сообщение
- Доступ: JWT + роли `customer`, `driver`, `manager`
- Тело запроса: отсутствует
- Ответ: `MessageResponseDto`
- Возможные статусы: `200`, `401`, `403`

##### Response schema

```json
{
  "message": "Logged out successfully"
}
```

### 3.2. UsersController

Базовый путь: `/users`

Все эндпоинты требуют JWT и одну из ролей: `customer`, `driver`, `manager`.

#### GET `/users/me`

- Краткое описание: получить свой профиль
- Что делает: возвращает профиль текущего пользователя по `sub` из JWT
- Вход: нет body, токен в заголовке
- Ответ: `UserProfileDto`
- Возможные статусы: `200`, `401`, `403`, `404`

##### Response schema

```json
{
  "id": 12,
  "name": "Иван",
  "phone": "+375291234567",
  "role": "customer",
  "createdAt": "2026-04-27T08:30:00.000Z",
  "updatedAt": "2026-04-27T09:00:00.000Z",
  "driverProfile": null,
  "credentials": {
    "email": "user@test.by"
  }
}
```

#### PATCH `/users/me`

- Краткое описание: обновить свой профиль
- Что делает: изменяет имя и/или телефон текущего пользователя
- Вход: `UpdateProfileDto`
- Ответ: `UserProfileDto`
- Возможные статусы: `200`, `400`, `401`, `403`, `404`

##### Request schema

```json
{
  "name": "Иван",
  "phone": "+375291234567"
}
```

##### Response schema

```json
{
  "id": 12,
  "name": "Иван",
  "phone": "+375291234567",
  "role": "customer",
  "createdAt": "2026-04-27T08:30:00.000Z",
  "updatedAt": "2026-04-27T09:00:00.000Z",
  "driverProfile": null,
  "credentials": {
    "email": "user@test.by"
  }
}
```

### 3.3. DriverProfileController

Базовый путь: `/drivers`

Все эндпоинты требуют JWT и роль `driver`.

#### PATCH `/drivers/me/status`

- Краткое описание: обновить онлайн-статус водителя
- Что делает: переключает `isOnline` у текущего драйвер-профиля
- Вход: `UpdateDriverStatusDto`
- Ответ: `DriverProfileDto`
- Возможные статусы: `200`, `400`, `401`, `403`

##### Request schema

```json
{
  "isOnline": true
}
```

##### Response schema

```json
{
  "id": 7,
  "userId": 12,
  "comfortLevel": "comfort",
  "driverLicense": "AB1234567",
  "updatedAt": "2026-04-27T10:00:00.000Z",
  "isOnline": true,
  "cars": [
    {
      "id": 3,
      "driverId": 7,
      "make": "Toyota",
      "model": "Camry",
      "color": "Белый",
      "number": "1234 AB-7"
    }
  ]
}
```

### 3.4. DriversApplicationController

Базовый путь: `/driver-applications`

#### POST `/driver-applications`

- Краткое описание: подать заявку на роль водителя
- Что делает: создаёт заявку на обработку менеджером
- Доступ: публичный
- Вход: `CreateDriverApplicationDto`
- Ответ: `DriverApplicationResponseDto`
- Возможные статусы: `201`, `400`, `409`

##### Request schema

```json
{
  "email": "driver@test.by",
  "password": "password123",
  "name": "Иван",
  "phone": "+375291234567"
}
```

##### Response schema

```json
{
  "id": 10,
  "email": "driver@test.by",
  "name": "Иван",
  "phone": "+375291234567",
  "passwordHash": "$2b$10$hash",
  "driverLicense": null,
  "carMake": null,
  "carModel": null,
  "carColor": null,
  "carNumber": null,
  "comfortLevel": null,
  "status": "pending",
  "comment": null,
  "reviewedBy": null,
  "reviewedAt": null,
  "driverId": null,
  "createdAt": "2026-04-27T09:00:00.000Z"
}
```

### 3.5. ManagerDriverApplicationsController

Базовый путь: `/driver-applications`

Все эндпоинты требуют JWT и роль `manager`.

#### GET `/driver-applications`

- Краткое описание: список заявок на роль водителя
- Что делает: возвращает все заявки, при необходимости фильтруя по статусу
- Вход: query `status` необязательный, enum `pending | approved | rejected`
- Ответ: `DriverApplicationResponseDto[]`
- Возможные статусы: `200`, `400`, `401`, `403`

##### Query schema

```json
{
  "status": "pending"
}
```

##### Response schema

```json
[
  {
    "id": 10,
    "email": "driver@test.by",
    "name": "Иван",
    "phone": "+375291234567",
    "passwordHash": "$2b$10$hash",
    "driverLicense": null,
    "carMake": null,
    "carModel": null,
    "carColor": null,
    "carNumber": null,
    "comfortLevel": null,
    "status": "pending",
    "comment": null,
    "reviewedBy": null,
    "reviewedAt": null,
    "driverId": null,
    "createdAt": "2026-04-27T09:00:00.000Z"
  }
]
```

#### GET `/driver-applications/:id`

- Краткое описание: получить заявку по ID
- Что делает: возвращает детальную информацию об одной заявке
- Вход: path param `id` как число
- Ответ: `DriverApplicationResponseDto`
- Возможные статусы: `200`, `400`, `401`, `403`, `404`

##### Path params

```json
{
  "id": 10
}
```

##### Response schema

```json
{
  "id": 10,
  "email": "driver@test.by",
  "name": "Иван",
  "phone": "+375291234567",
  "passwordHash": "$2b$10$hash",
  "driverLicense": null,
  "carMake": null,
  "carModel": null,
  "carColor": null,
  "carNumber": null,
  "comfortLevel": null,
  "status": "pending",
  "comment": null,
  "reviewedBy": null,
  "reviewedAt": null,
  "driverId": null,
  "createdAt": "2026-04-27T09:00:00.000Z"
}
```

#### PATCH `/driver-applications/:id`

- Краткое описание: обработать заявку менеджером
- Что делает: либо одобряет заявку и создаёт профиль водителя, либо отклоняет её с комментарием
- Вход: path param `id`, body `ProcessApplicationDto`
- Ответ: `DriverApplicationResponseDto`
- Возможные статусы: `200`, `400`, `401`, `403`, `404`

##### Request schema при `approve`

```json
{
  "action": "approve",
  "driverLicenseNumber": "AB1234567",
  "carMake": "Toyota",
  "carModel": "Camry",
  "carColor": "Белый",
  "carPlate": "1234 AB-7",
  "comfortLevel": "comfort"
}
```

##### Request schema при `reject`

```json
{
  "action": "reject",
  "comment": "Недостаточно данных"
}
```

##### Response schema

```json
{
  "id": 10,
  "email": "driver@test.by",
  "name": "Иван",
  "phone": "+375291234567",
  "passwordHash": "$2b$10$hash",
  "driverLicense": "AB1234567",
  "carMake": "Toyota",
  "carModel": "Camry",
  "carColor": "Белый",
  "carNumber": "1234 AB-7",
  "comfortLevel": "comfort",
  "status": "approved",
  "comment": null,
  "reviewedBy": 5,
  "reviewedAt": "2026-04-27T12:00:00.000Z",
  "driverId": 7,
  "createdAt": "2026-04-27T09:00:00.000Z"
}
```

### 3.6. OrdersController

Базовый путь: `/orders`

Все эндпоинты требуют JWT и роли `customer` или `driver`, если не указано иное.

#### POST `/orders`

- Краткое описание: создать заказ
- Что делает: создаёт новый заказ от имени текущего клиента
- Доступ: JWT + роль `customer`
- Вход: `CreateOrderDto`
- Ответ: `OrderResponseDto`
- Возможные статусы: `201`, `400`, `401`, `403`

##### Request schema

```json
{
  "pickupAddress": "Минск, ул. Ленина 1",
  "pickupLatitude": 53.902334,
  "pickupLongitude": 27.561879,
  "dropoffAddress": "Минск, пр. Победителей 7",
  "dropoffLatitude": 53.910123,
  "dropoffLongitude": 27.534567,
  "comfortLevel": "economy"
}
```

##### Response schema

```json
{
  "id": 101,
  "customerId": 12,
  "driverId": null,
  "pickupAddress": "Минск, ул. Ленина 1",
  "pickupLatitude": 53.902334,
  "pickupLongitude": 27.561879,
  "dropoffAddress": "Минск, пр. Победителей 7",
  "dropoffLatitude": 53.910123,
  "dropoffLongitude": 27.534567,
  "comfortLevel": "economy",
  "distanceMeters": null,
  "durationSec": null,
  "priceByn": null,
  "status": "searchingDriver",
  "createdAt": "2026-04-27T10:15:00.000Z",
  "updatedAt": "2026-04-27T10:16:00.000Z",
  "acceptedAt": null,
  "finishedAt": null
}
```

#### GET `/orders/current`

- Краткое описание: получить текущий заказ
- Что делает: возвращает активный заказ текущего пользователя
- Доступ: JWT + роли `customer` или `driver`
- Вход: токен в заголовке
- Ответ: `OrderResponseDto`
- Возможные статусы: `200`, `401`, `403`

##### Response schema

```json
{
  "id": 101,
  "customerId": 12,
  "driverId": 7,
  "pickupAddress": "Минск, ул. Ленина 1",
  "pickupLatitude": 53.902334,
  "pickupLongitude": 27.561879,
  "dropoffAddress": "Минск, пр. Победителей 7",
  "dropoffLatitude": 53.910123,
  "dropoffLongitude": 27.534567,
  "comfortLevel": "economy",
  "distanceMeters": 5400,
  "durationSec": 780,
  "priceByn": 8.5,
  "status": "driverAssigned",
  "createdAt": "2026-04-27T10:15:00.000Z",
  "updatedAt": "2026-04-27T10:16:00.000Z",
  "acceptedAt": "2026-04-27T10:20:00.000Z",
  "finishedAt": null
}
```

#### GET `/orders/:id`

- Краткое описание: получить заказ по ID
- Что делает: возвращает детальные данные конкретного заказа с проверкой прав доступа
- Доступ: JWT + роли `customer` или `driver`
- Вход: path param `id`
- Ответ: `OrderResponseDto`
- Возможные статусы: `200`, `400`, `401`, `403`, `404`

##### Path params

```json
{
  "id": 101
}
```

##### Response schema

```json
{
  "id": 101,
  "customerId": 12,
  "driverId": 7,
  "pickupAddress": "Минск, ул. Ленина 1",
  "pickupLatitude": 53.902334,
  "pickupLongitude": 27.561879,
  "dropoffAddress": "Минск, пр. Победителей 7",
  "dropoffLatitude": 53.910123,
  "dropoffLongitude": 27.534567,
  "comfortLevel": "economy",
  "distanceMeters": 5400,
  "durationSec": 780,
  "priceByn": 8.5,
  "status": "inProgress",
  "createdAt": "2026-04-27T10:15:00.000Z",
  "updatedAt": "2026-04-27T10:16:00.000Z",
  "acceptedAt": "2026-04-27T10:20:00.000Z",
  "finishedAt": null
}
```

#### PATCH `/orders/:id`

- Краткое описание: обновить статус заказа
- Что делает: переводит заказ в новый статус
- Доступ: JWT + роли `customer` или `driver`
- Вход: path param `id`, body `UpdateOrderStatusDto`
- Ответ: `OrderResponseDto`
- Возможные статусы: `200`, `400`, `401`, `403`, `404`

##### Request schema

```json
{
  "status": "driverAssigned"
}
```

##### Response schema

```json
{
  "id": 101,
  "customerId": 12,
  "driverId": 7,
  "pickupAddress": "Минск, ул. Ленина 1",
  "pickupLatitude": 53.902334,
  "pickupLongitude": 27.561879,
  "dropoffAddress": "Минск, пр. Победителей 7",
  "dropoffLatitude": 53.910123,
  "dropoffLongitude": 27.534567,
  "comfortLevel": "economy",
  "distanceMeters": 5400,
  "durationSec": 780,
  "priceByn": 8.5,
  "status": "driverAssigned",
  "createdAt": "2026-04-27T10:15:00.000Z",
  "updatedAt": "2026-04-27T10:16:00.000Z",
  "acceptedAt": "2026-04-27T10:20:00.000Z",
  "finishedAt": null
}
```

### 3.7. DriverOrdersController

Базовый путь: `/drivers/orders`

Все эндпоинты требуют JWT и роль `driver`.

#### GET `/drivers/orders/available`

- Краткое описание: получить доступные заказы
- Что делает: возвращает список заказов, доступных для принятия водителем
- Вход: только токен
- Ответ: `OrderResponseDto[]`
- Возможные статусы: `200`, `401`, `403`

##### Response schema

```json
[
  {
    "id": 101,
    "customerId": 12,
    "driverId": null,
    "pickupAddress": "Минск, ул. Ленина 1",
    "pickupLatitude": 53.902334,
    "pickupLongitude": 27.561879,
    "dropoffAddress": "Минск, пр. Победителей 7",
    "dropoffLatitude": 53.910123,
    "dropoffLongitude": 27.534567,
    "comfortLevel": "economy",
    "distanceMeters": null,
    "durationSec": null,
    "priceByn": null,
    "status": "searchingDriver",
    "createdAt": "2026-04-27T10:15:00.000Z",
    "updatedAt": "2026-04-27T10:16:00.000Z",
    "acceptedAt": null,
    "finishedAt": null
  }
]
```

#### GET `/drivers/orders/history`

- Краткое описание: история заказов водителя
- Что делает: возвращает пагинированную историю заказов текущего водителя
- Вход: query `PaginationQueryDto`
- Ответ: `PaginatedDto<OrderResponseDto>` с полями `data` и `meta`
- Возможные статусы: `200`, `400`, `401`, `403`

##### Query schema

```json
{
  "page": 1,
  "limit": 10
}
```

##### Response schema

```json
{
  "data": [
    {
      "id": 101,
      "customerId": 12,
      "driverId": 7,
      "pickupAddress": "Минск, ул. Ленина 1",
      "pickupLatitude": 53.902334,
      "pickupLongitude": 27.561879,
      "dropoffAddress": "Минск, пр. Победителей 7",
      "dropoffLatitude": 53.910123,
      "dropoffLongitude": 27.534567,
      "comfortLevel": "economy",
      "distanceMeters": 5400,
      "durationSec": 780,
      "priceByn": 8.5,
      "status": "finished",
      "createdAt": "2026-04-27T10:15:00.000Z",
      "updatedAt": "2026-04-27T10:16:00.000Z",
      "acceptedAt": "2026-04-27T10:20:00.000Z",
      "finishedAt": "2026-04-27T10:45:00.000Z"
    }
  ],
  "meta": {
    "total": 125,
    "page": 1,
    "limit": 10,
    "offset": 0,
    "hasMore": true
  }
}
```

### 3.8. CustomerOrdersController

Базовый путь: `/customers/orders`

Все эндпоинты требуют JWT и роль `customer`.

#### GET `/customers/orders/history`

- Краткое описание: история заказов клиента
- Что делает: возвращает пагинированную историю заказов текущего клиента
- Вход: query `PaginationQueryDto`
- Ответ: `PaginatedDto<OrderResponseDto>` с полями `data` и `meta`
- Возможные статусы: `200`, `400`, `401`, `403`

##### Query schema

```json
{
  "page": 1,
  "limit": 10
}
```

##### Response schema

```json
{
  "data": [
    {
      "id": 101,
      "customerId": 12,
      "driverId": 7,
      "pickupAddress": "Минск, ул. Ленина 1",
      "pickupLatitude": 53.902334,
      "pickupLongitude": 27.561879,
      "dropoffAddress": "Минск, пр. Победителей 7",
      "dropoffLatitude": 53.910123,
      "dropoffLongitude": 27.534567,
      "comfortLevel": "economy",
      "distanceMeters": 5400,
      "durationSec": 780,
      "priceByn": 8.5,
      "status": "finished",
      "createdAt": "2026-04-27T10:15:00.000Z",
      "updatedAt": "2026-04-27T10:16:00.000Z",
      "acceptedAt": "2026-04-27T10:20:00.000Z",
      "finishedAt": "2026-04-27T10:45:00.000Z"
    }
  ],
  "meta": {
    "total": 125,
    "page": 1,
    "limit": 10,
    "offset": 0,
    "hasMore": true
  }
}
```

### 3.9. PublicInfoController

Базовый путь: корень приложения, без controller prefix

#### GET `/drivers/:id`

- Краткое описание: публичная информация о водителе
- Что делает: возвращает публичный профиль водителя для клиента
- Доступ: JWT + роль `customer`
- Вход: path param `id`
- Ответ: `DriverPublicInfoDto`
- Возможные статусы: `200`, `400`, `401`, `403`, `404`

##### Path params

```json
{
  "id": 7
}
```

##### Response schema

```json
{
  "id": 7,
  "userId": 12,
  "comfortLevel": "comfort",
  "driverLicense": "AB1234567",
  "isOnline": true,
  "user": {
    "name": "Иван",
    "phone": "+375291234567"
  },
  "cars": [
    {
      "make": "Toyota",
      "model": "Camry",
      "color": "Белый",
      "number": "1234 AB-7"
    }
  ]
}
```

#### GET `/customers/:id`

- Краткое описание: публичная информация о клиенте
- Что делает: возвращает имя и телефон клиента для водителя
- Доступ: JWT + роль `driver`
- Вход: path param `id`
- Ответ: `CustomerPublicInfoDto`
- Возможные статусы: `200`, `400`, `401`, `403`, `404`

##### Path params

```json
{
  "id": 12
}
```

##### Response schema

```json
{
  "name": "Иван",
  "phone": "+375291234567"
}
```

### 3.10. CustomerReviewsController

Базовый путь: `/orders`

#### POST `/orders/:id/review`

- Краткое описание: оставить отзыв по заказу
- Что делает: создаёт отзыв клиента по завершённому заказу
- Доступ: JWT + роль `customer`
- Вход: path param `id`, body `CreateReviewDto`
- Ответ: `ReviewResponseDto`
- Возможные статусы: `201`, `400`, `401`, `403`, `404`

##### Request schema

```json
{
  "rating": 5,
  "comment": "Вежливый водитель"
}
```

##### Response schema

```json
{
  "id": 55,
  "orderId": 101,
  "rating": 5,
  "comment": "Вежливый водитель",
  "createdAt": "2026-04-27T11:00:00.000Z"
}
```

#### GET `/orders/:id/review`

- Краткое описание: получить отзыв по заказу
- Что делает: возвращает отзыв, связанный с заказом
- Доступ: JWT + роли `customer`, `driver`, `manager`
- Вход: path param `id`
- Ответ: `ReviewResponseDto`
- Возможные статусы: `200`, `400`, `401`, `403`, `404`

##### Path params

```json
{
  "id": 101
}
```

##### Response schema

```json
{
  "id": 55,
  "orderId": 101,
  "rating": 5,
  "comment": "Вежливый водитель",
  "createdAt": "2026-04-27T11:00:00.000Z"
}
```

### 3.11. DriverReviewsController

Базовый путь: `/drivers`

Все эндпоинты требуют JWT и роль `driver`.

#### GET `/drivers/me/reviews`

- Краткое описание: отзывы о текущем водителе
- Что делает: возвращает пагинированный список отзывов и средний рейтинг
- Вход: query `PaginationQueryDto`
- Ответ: объект с полями `data`, `meta`, `averageRating`
- Возможные статусы: `200`, `400`, `401`, `403`

##### Query schema

```json
{
  "page": 1,
  "limit": 10
}
```

##### Response schema

```json
{
  "data": [
    {
      "id": 55,
      "orderId": 101,
      "rating": 5,
      "comment": "Вежливый водитель",
      "createdAt": "2026-04-27T11:00:00.000Z",
      "order": {
        "id": 101,
        "pickupAddress": "Минск, ул. Ленина 1",
        "dropoffAddress": "Минск, пр. Победителей 7",
        "createdAt": "2026-04-27T09:30:00.000Z"
      }
    }
  ],
  "meta": {
    "total": 25,
    "page": 1,
    "limit": 10,
    "offset": 0,
    "hasMore": true
  },
  "averageRating": 4.7
}
```

## 4. Практические замечания для фронтенда

- Для всех защищённых запросов нужно сначала получить `access_token`, затем подставлять его в `Authorization`
- Для роли `customer` доступны: создание заказа, просмотр своих заказов, просмотр публичной информации о водителях, отзывы по своим заказам, профиль
- Для роли `driver` доступны: просмотр доступных заказов, история заказов, публичная информация о клиентах, отзывы о себе, смена статуса, профиль
- Для роли `manager` доступны: работа с заявками водителей, профиль, просмотр заказов по правам доступа, просмотр отзывов по заказам
- Для истории и отзывов используйте `page` и `limit`; если не передавать их, backend подставит `1` и `10`
- Если фронтенд отправляет `id` в URL, он может передавать строку, но backend сам приведёт её к числу благодаря `ParseIntPipe`
- Поля с датами не нужно парсить вручную как числа, они приходят как строки ISO
